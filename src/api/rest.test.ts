import { afterEach, describe, expect, it, vi } from 'vitest'
import { rest, collectPages } from './rest'
import type { PaginatedResponse } from './protocol'

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }) {
  const res = {
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
  } as unknown as Response
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(res)
}

afterEach(() => vi.restoreAllMocks())

describe('rest', () => {
  it('GET sends a Bearer auth header and returns parsed JSON', async () => {
    const spy = mockFetch({ jsonBody: { data: [1, 2] } })
    const out = await rest.get<{ data: number[] }>('/tags')
    expect(out).toEqual({ data: [1, 2] })
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toContain('/tags')
    expect((init?.headers as Record<string, string>).Authorization).toMatch(/^Bearer /)
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
