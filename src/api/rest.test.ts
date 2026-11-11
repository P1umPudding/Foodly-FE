import { afterEach, describe, expect, it, vi } from 'vitest'
import { rest, collectPages } from './rest'
import type { PaginatedResponse } from './protocol'
import { jsonResponse, jwt, seedSession, storedSession } from '../test/auth'
import * as auth from './auth'

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }) {
  const res = {
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
  } as unknown as Response
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(res)
}

let unsubscribes: Array<() => void> = []

afterEach(() => {
  unsubscribes.forEach((unsubscribe) => unsubscribe())
  unsubscribes = []
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('rest', () => {
  it('GET sends the session bearer and returns parsed JSON', async () => {
    const { accessToken } = seedSession()
    const spy = mockFetch({ jsonBody: { data: [1, 2] } })
    const out = await rest.get<{ data: number[] }>('/tags')
    expect(out).toEqual({ data: [1, 2] })
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toContain('/tags')
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${accessToken}`)
  })

  it('POST serializes the body and sets the JSON content type', async () => {
    const spy = mockFetch({ jsonBody: { data: [], cursor: null } })
    await rest.post('/recipes/search?page=1&limit=100', { sort: { field: 'name', order: 'asc' } })
    const [, init] = spy.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"sort":{"field":"name","order":"asc"}}')
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('throws the backend error.message on non-2xx', async () => {
    mockFetch({ ok: false, status: 403, jsonBody: { error: { code: 'FORBIDDEN', message: 'nope' } } })
    await expect(rest.get('/recipes/1')).rejects.toThrow('nope')
  })

  it('returns undefined for 204', async () => {
    mockFetch({ ok: true, status: 204, jsonBody: undefined })
    await expect(rest.get('/x')).resolves.toBeUndefined()
  })

  it('getBlob sends the session bearer and returns the body as a blob', async () => {
    const { accessToken } = seedSession()
    const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' })
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, status: 200, blob: async () => blob } as unknown as Response)
    await expect(rest.getBlob('/tags/vegan/icon')).resolves.toBe(blob)
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toMatch(/\/tags\/vegan\/icon$/)
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${accessToken}`)
  })

  it('getBlob throws the backend error.message on non-2xx', async () => {
    mockFetch({ ok: false, status: 404, jsonBody: { error: { code: 'NOT_FOUND', message: 'Tag has no icon' } } })
    await expect(rest.getBlob('/tags/x/icon')).rejects.toThrow('Tag has no icon')
  })
})

describe('rest with a session', () => {
  const unauthorized = () => jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } })
  const bearerOf = (init?: RequestInit) => (init?.headers as Record<string, string> | undefined)?.Authorization
  const isRefresh = (url: unknown) => String(url).endsWith('/auth/refresh')

  // Routes answer from `route` until the bearer is `accepted`; refresh hands out `fresh`.
  function backend(options: { accepted: string; fresh: string; route?: (token?: string) => Response }) {
    const route =
      options.route ??
      ((token) => (token === `Bearer ${options.accepted}` ? jsonResponse(200, { ok: true }) : unauthorized()))
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (isRefresh(url)) return jsonResponse(200, { accessToken: options.fresh, refreshToken: 'r2' })
      return route(bearerOf(init))
    })
  }
  const calls = (spy: ReturnType<typeof backend>) => ({
    refresh: spy.mock.calls.filter(([url]) => isRefresh(url)).length,
    route: spy.mock.calls.filter(([url]) => !isRefresh(url)).map(([, init]) => bearerOf(init)),
  })

  it('sends no Authorization header without a session', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, {}))
    await rest.get('/tags')
    expect(bearerOf(spy.mock.calls[0][1])).toBeUndefined()
  })

  it('calls fetch synchronously while the token is valid (pendingSaves relies on it)', () => {
    seedSession()
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, {}))
    void rest.get('/tags')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('two parallel requests with an expired token trigger exactly one refresh', async () => {
    seedSession({ accessToken: jwt(-60) })
    const fresh = jwt(900)
    const spy = backend({ accepted: fresh, fresh })
    await Promise.all([rest.get('/tags'), rest.get('/ingredients')])
    expect(calls(spy)).toEqual({ refresh: 1, route: [`Bearer ${fresh}`, `Bearer ${fresh}`] })
  })

  it('401 → one refresh → exactly one retry with the new token', async () => {
    const stale = seedSession().accessToken
    const fresh = jwt(900)
    const spy = backend({ accepted: fresh, fresh })
    await expect(rest.get('/recipes/1')).resolves.toEqual({ ok: true })
    expect(calls(spy)).toEqual({ refresh: 1, route: [`Bearer ${stale}`, `Bearer ${fresh}`] })
  })

  it('a second 401 ends the session as expired without a third request', async () => {
    seedSession()
    const spy = backend({ accepted: 'never', fresh: jwt(900) })
    const listener = vi.fn()
    unsubscribes.push(auth.subscribe(listener))

    await expect(rest.get('/recipes/1')).rejects.toThrow('Unauthorized')
    expect(spy).toHaveBeenCalledTimes(3)
    expect(calls(spy).route).toHaveLength(2)
    expect(storedSession()).toBeNull()
    expect(listener).toHaveBeenCalledWith(null, { type: 'signed-out', reason: 'expired' })
  })

  it('keeps the session when the retry fails but another tab stored a new token meanwhile', async () => {
    seedSession({ userId: 1 })
    const otherTab = jwt(900)
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (isRefresh(url)) return jsonResponse(200, { accessToken: jwt(900), refreshToken: 'r2' })
      if (spy.mock.calls.length === 3) seedSession({ accessToken: otherTab, refreshToken: 'r3', userId: 1 })
      return unauthorized()
    })
    await expect(rest.get('/recipes/1')).rejects.toThrow('Unauthorized')
    expect(storedSession()?.accessToken).toBe(otherTab)
  })

  it('retries without a refresh when the stored token was already rotated', async () => {
    const stale = seedSession({ userId: 1 }).accessToken
    const rotated = jwt(900)
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (bearerOf(init) === `Bearer ${rotated}`) return jsonResponse(200, { ok: true })
      seedSession({ accessToken: rotated, refreshToken: 'r2', userId: 1 })
      return unauthorized()
    })
    await expect(rest.get('/recipes/1')).resolves.toEqual({ ok: true })
    expect(calls(spy)).toEqual({ refresh: 0, route: [`Bearer ${stale}`, `Bearer ${rotated}`] })
  })

  it('never retries as another user who signed in meanwhile', async () => {
    seedSession({ userId: 1 })
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      seedSession({ accessToken: jwt(900), refreshToken: 'r-b', userId: 2 })
      return unauthorized()
    })
    await expect(rest.put('/recipes/1', { name: 'x' })).rejects.toThrow('Unauthorized')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(storedSession()?.userId).toBe(2)
  })

  it('a refresh that failed for this request is not repeated on the 401 that follows', async () => {
    seedSession({ accessToken: jwt(-60) })
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) =>
        isRefresh(url)
          ? jsonResponse(429, { error: { code: 'TOO_MANY_REQUESTS', message: 'slow down' } })
          : unauthorized(),
      )
    await expect(Promise.all([rest.get('/tags'), rest.get('/ingredients')])).rejects.toThrow('slow down')
    expect(calls(spy).refresh).toBe(1)
    expect(storedSession()).not.toBeNull()
  })

  it('after a failed refresh still retries once with a token another tab rotated meanwhile', async () => {
    const stale = seedSession({ accessToken: jwt(-60), userId: 1 }).accessToken
    const rotated = jwt(900)
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (isRefresh(url)) {
        seedSession({ accessToken: rotated, refreshToken: 'r-other', userId: 1 })
        throw new DOMException('signal timed out', 'TimeoutError')
      }
      return bearerOf(init) === `Bearer ${rotated}` ? jsonResponse(200, { ok: true }) : unauthorized()
    })
    await expect(rest.get('/tags')).resolves.toEqual({ ok: true })
    expect(calls(spy)).toEqual({ refresh: 1, route: [`Bearer ${stale}`, `Bearer ${rotated}`] })
  })

  it('a refresh that fails with a network error rejects the call and keeps the session', async () => {
    seedSession()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (isRefresh(url)) throw new TypeError('Failed to fetch')
      return unauthorized()
    })
    await expect(rest.get('/recipes/1')).rejects.toThrow('Failed to fetch')
    expect(storedSession()).not.toBeNull()
  })

  it('no retry when the refresh itself is rejected', async () => {
    seedSession()
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => unauthorized())
    await expect(rest.get('/recipes/1')).rejects.toThrow('Unauthorized')
    expect(spy.mock.calls.map(([url]) => isRefresh(url))).toEqual([false, true])
    expect(storedSession()).toBeNull()
  })

  it('postBinary takes the same refresh-and-retry path', async () => {
    const stale = seedSession().accessToken
    const fresh = jwt(900)
    const spy = backend({ accepted: fresh, fresh })
    const blob = new Blob(['x'], { type: 'image/png' })
    await rest.postBinary('/images', blob)
    expect(calls(spy)).toEqual({ refresh: 1, route: [`Bearer ${stale}`, `Bearer ${fresh}`] })
    const retry = spy.mock.lastCall?.[1]
    expect(retry?.body).toBe(blob)
    expect((retry?.headers as Record<string, string>)['Content-Type']).toBe('image/png')
  })

  it('getBlob takes the same refresh-and-retry path', async () => {
    const stale = seedSession().accessToken
    const fresh = jwt(900)
    const blob = new Blob(['<svg/>'])
    const spy = backend({
      accepted: fresh,
      fresh,
      route: (token) =>
        token === `Bearer ${fresh}`
          ? ({ ok: true, status: 200, blob: async () => blob } as unknown as Response)
          : unauthorized(),
    })
    await expect(rest.getBlob('/tags/vegan/icon')).resolves.toBe(blob)
    expect(calls(spy)).toEqual({ refresh: 1, route: [`Bearer ${stale}`, `Bearer ${fresh}`] })
  })

  it('/auth/* requests never refresh or retry', async () => {
    seedSession()
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => unauthorized())
    await expect(rest.post('/auth/login', { email: 'a', password: 'b' })).rejects.toThrow('Unauthorized')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(storedSession()).not.toBeNull()
  })
})

describe('collectPages', () => {
  it('fetches a single page and stops when cursor is null', async () => {
    const fetchPage = vi.fn(async (): Promise<PaginatedResponse<number>> => ({ data: [1, 2], cursor: null }))
    const out = await collectPages(fetchPage)
    expect(out).toEqual([1, 2])
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith(1)
  })

  it('accumulates pages in order, following the cursor until it is null', async () => {
    const pages: Record<number, PaginatedResponse<number>> = {
      1: { data: [1, 2], cursor: '2' },
      2: { data: [3, 4], cursor: '3' },
      3: { data: [5], cursor: null },
    }
    const fetchPage = vi.fn(async (page: number) => pages[page])
    const out = await collectPages(fetchPage)
    expect(out).toEqual([1, 2, 3, 4, 5])
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([1, 2, 3])
  })
})
