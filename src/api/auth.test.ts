import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jwt, jsonResponse, seedSession, storedSession } from '../test/auth'

type Auth = typeof import('./auth')

let auth: Auth

beforeEach(async () => {
  vi.resetModules()
  auth = await import('./auth')
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  Reflect.deleteProperty(navigator, 'locks')
})

const isRefresh = (url: unknown) => String(url).endsWith('/auth/refresh')

function mockRefresh(respond: () => Promise<Response> | Response) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (isRefresh(url)) return respond()
    throw new Error(`unexpected fetch ${String(url)}`)
  })
}

const refreshCalls = (spy: ReturnType<typeof mockRefresh>) => spy.mock.calls.filter(([url]) => isRefresh(url))

describe('stored session', () => {
  it('reads a valid session and exposes only the user id', () => {
    seedSession({ userId: 4 })
    expect(auth.session()).toEqual({ userId: 4 })
  })

  it('treats missing, corrupt or incomplete storage as signed out', () => {
    expect(auth.session()).toBeNull()
    localStorage.setItem('foodly.auth', '{not json')
    expect(auth.session()).toBeNull()
    localStorage.setItem('foodly.auth', JSON.stringify({ accessToken: 'a', userId: 1 }))
    expect(auth.session()).toBeNull()
  })

  it('keeps the same snapshot object across a token refresh', async () => {
    seedSession({ accessToken: jwt(-60) })
    const before = auth.session()
    mockRefresh(() => jsonResponse(200, { accessToken: jwt(900), refreshToken: 'r2' }))
    await auth.getAccessToken()
    expect(storedSession()?.refreshToken).toBe('r2')
    expect(auth.session()).toBe(before)
  })
})

describe('getAccessToken', () => {
  it('returns null without a session and sends nothing', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    await expect(auth.getAccessToken()).resolves.toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('returns a token that is valid for more than 30 s without a request', async () => {
    const token = jwt(120)
    seedSession({ accessToken: token })
    const spy = vi.spyOn(globalThis, 'fetch')
    await expect(auth.getAccessToken()).resolves.toBe(token)
    expect(spy).not.toHaveBeenCalled()
  })

  it('decodes base64url payloads (- and _)', async () => {
    // "?>" and "~~~" encode to "_" / "-" in base64url
    const token = jwt(120, { pad: '?>?>~~~' })
    expect(token.split('.')[1]).toMatch(/[-_]/)
    seedSession({ accessToken: token })
    const spy = vi.spyOn(globalThis, 'fetch')
    await expect(auth.getAccessToken()).resolves.toBe(token)
    expect(spy).not.toHaveBeenCalled()
  })

  it('refreshes a token that expires within 30 s and stores the rotated pair', async () => {
    seedSession({ accessToken: jwt(10), refreshToken: 'r1', userId: 3 })
    const fresh = jwt(900)
    const spy = mockRefresh(() => jsonResponse(200, { accessToken: fresh, refreshToken: 'r2' }))
    await expect(auth.getAccessToken()).resolves.toBe(fresh)
    const [, init] = refreshCalls(spy)[0]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ refreshToken: 'r1' }))
    expect(new Headers(init?.headers).get('Authorization')).toBeNull()
    expect(storedSession()).toEqual({ accessToken: fresh, refreshToken: 'r2', userId: 3 })
  })

  it('treats a token without a readable exp as expired', async () => {
    seedSession({ accessToken: 'not-a-jwt' })
    const spy = mockRefresh(() => jsonResponse(200, { accessToken: jwt(900), refreshToken: 'r2' }))
    await auth.getAccessToken()
    expect(refreshCalls(spy)).toHaveLength(1)
  })

  it('shares one refresh between parallel callers', async () => {
    seedSession({ accessToken: jwt(-60) })
    const fresh = jwt(900)
    const spy = mockRefresh(() => jsonResponse(200, { accessToken: fresh, refreshToken: 'r2' }))
    const tokens = await Promise.all([auth.getAccessToken(), auth.getAccessToken()])
    expect(tokens).toEqual([fresh, fresh])
    expect(refreshCalls(spy)).toHaveLength(1)
  })

  it('on a rate-limited refresh keeps a still-valid token and throws for an expired one', async () => {
    const almost = jwt(10)
    seedSession({ accessToken: almost })
    const spy = mockRefresh(() => jsonResponse(429, { error: { code: 'TOO_MANY_REQUESTS', message: 'slow down' } }))
    await expect(auth.getAccessToken()).resolves.toBe(almost)

    seedSession({ accessToken: jwt(-60) })
    await expect(auth.getAccessToken()).rejects.toThrow('slow down')
    expect(auth.session()).not.toBeNull()
    // the failed refresh is not cached: the next call tries again
    await expect(auth.getAccessToken()).rejects.toThrow('slow down')
    expect(refreshCalls(spy)).toHaveLength(3)
  })

  it('ends the session as expired when the refresh token is rejected', async () => {
    seedSession({ accessToken: jwt(-60) })
    mockRefresh(() => jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
    const listener = vi.fn()
    auth.subscribe(listener)
    await expect(auth.getAccessToken()).resolves.toBeNull()
    expect(storedSession()).toBeNull()
    expect(listener).toHaveBeenCalledWith(null, { type: 'signed-out', reason: 'expired' })
  })

  it('adopts a token another tab rotated meanwhile instead of signing out on 401', async () => {
    seedSession({ accessToken: jwt(-60), refreshToken: 'r1' })
    const otherTab = jwt(900)
    mockRefresh(() => {
      seedSession({ accessToken: otherTab, refreshToken: 'r-other' })
      return jsonResponse(401, {})
    })
    await expect(auth.getAccessToken()).resolves.toBe(otherTab)
    expect(storedSession()?.refreshToken).toBe('r-other')
  })

  it('does not bring the session back when sign-out happens during a refresh', async () => {
    seedSession({ accessToken: jwt(-60) })
    let answer: (res: Response) => void = () => {}
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
      isRefresh(url) ? new Promise<Response>((resolve) => (answer = resolve)) : Promise.resolve(jsonResponse(204)),
    )
    const pending = auth.getAccessToken()
    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    void auth.signOut()
    answer(jsonResponse(200, { accessToken: jwt(900), refreshToken: 'r2' }))
    await expect(pending).resolves.toBeNull()
    expect(storedSession()).toBeNull()
  })
})

describe('Web Locks across tabs', () => {
  it('uses the token another tab refreshed while this one waited for the lock', async () => {
    seedSession({ accessToken: jwt(-60), refreshToken: 'r1' })
    const otherTab = jwt(900)
    const request = vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
      seedSession({ accessToken: otherTab, refreshToken: 'r2' })
      return callback()
    })
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
    const spy = vi.spyOn(globalThis, 'fetch')

    await expect(auth.getAccessToken()).resolves.toBe(otherTab)
    expect(request).toHaveBeenCalledWith('foodly-auth-refresh', expect.any(Function))
    expect(spy).not.toHaveBeenCalled()
  })

  it('refreshes inside the lock when no other tab did', async () => {
    seedSession({ accessToken: jwt(-60) })
    const request = vi.fn((_name: string, callback: () => Promise<unknown>) => callback())
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
    const fresh = jwt(900)
    const spy = mockRefresh(() => jsonResponse(200, { accessToken: fresh, refreshToken: 'r2' }))

    await expect(auth.getAccessToken()).resolves.toBe(fresh)
    expect(request).toHaveBeenCalledTimes(1)
    expect(refreshCalls(spy)).toHaveLength(1)
  })
})

describe('subscribe', () => {
  const storageEvent = () => window.dispatchEvent(new StorageEvent('storage', { key: 'foodly.auth' }))

  it('follows sign-in and sign-out in another tab', () => {
    const listener = vi.fn()
    const unsubscribe = auth.subscribe(listener)

    seedSession({ userId: 2 })
    storageEvent()
    expect(listener).toHaveBeenLastCalledWith({ userId: 2 }, undefined)

    localStorage.removeItem('foodly.auth')
    storageEvent()
    expect(listener).toHaveBeenLastCalledWith(null, { type: 'signed-out', reason: 'signed-out' })

    unsubscribe()
    seedSession({ userId: 5 })
    storageEvent()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('ignores other keys and token-only changes', () => {
    seedSession({ userId: 2, refreshToken: 'r1' })
    const listener = vi.fn()
    auth.subscribe(listener)
    window.dispatchEvent(new StorageEvent('storage', { key: 'foodly.stub.ratings' }))
    seedSession({ userId: 2, refreshToken: 'r2' })
    storageEvent()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('signIn / signUp / signOut', () => {
  const user = { id: 7, name: 'Kim', profilePicture: null }

  it('signIn stores the session from the login response', async () => {
    const token = jwt(900)
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { user, accessToken: token, refreshToken: 'r1' }))
    const listener = vi.fn()
    auth.subscribe(listener)

    await expect(auth.signIn('kim@example.com', 'password123')).resolves.toEqual({ userId: 7 })
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toMatch(/\/auth\/login$/)
    expect(init?.body).toBe(JSON.stringify({ email: 'kim@example.com', password: 'password123' }))
    expect(new Headers(init?.headers).get('Authorization')).toBeNull()
    expect(storedSession()).toEqual({ accessToken: token, refreshToken: 'r1', userId: 7 })
    expect(listener).toHaveBeenCalledWith({ userId: 7 }, undefined)
  })

  it('signIn throws the backend message and stores nothing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }),
    )
    await expect(auth.signIn('kim@example.com', 'wrong')).rejects.toThrow('Invalid credentials')
    expect(storedSession()).toBeNull()
  })

  it('signUp posts to /auth/register and signs in', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(201, { user, accessToken: jwt(900), refreshToken: 'r1' }))
    await expect(auth.signUp('Kim', 'kim@example.com', 'password123')).resolves.toEqual({ userId: 7 })
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toMatch(/\/auth\/register$/)
    expect(init?.body).toBe(JSON.stringify({ name: 'Kim', email: 'kim@example.com', password: 'password123' }))
  })

  it('signOut sends the logout with bearer and refresh token, then clears', async () => {
    const token = jwt(900)
    seedSession({ accessToken: token, refreshToken: 'r1' })
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(204))
    const listener = vi.fn()
    auth.subscribe(listener)

    await auth.signOut()
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toMatch(/\/auth\/logout$/)
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${token}`)
    expect(init?.body).toBe(JSON.stringify({ refreshToken: 'r1' }))
    expect(storedSession()).toBeNull()
    expect(listener).toHaveBeenCalledWith(null, { type: 'signed-out', reason: 'signed-out' })
  })

  it('signOut clears the session even when the logout request fails', async () => {
    seedSession()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(auth.signOut()).resolves.toBeUndefined()
    expect(storedSession()).toBeNull()
  })
})
