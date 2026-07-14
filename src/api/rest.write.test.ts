import { afterEach, describe, expect, it, vi } from 'vitest'
import { rest } from './rest'

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

afterEach(() => vi.restoreAllMocks())

describe('rest write verbs', () => {
  it('put sends JSON and resolves the parsed body', async () => {
    const fetchSpy = mockFetch(200, { id: 7 })

    const result = await rest.put<{ id: number }>('/recipes/7', { name: 'Neu' })

    expect(result).toEqual({ id: 7 })
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/v1/recipes/7')
    expect(init?.method).toBe('PUT')
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(init?.body).toBe(JSON.stringify({ name: 'Neu' }))
  })

  it('del resolves undefined on 204', async () => {
    const fetchSpy = mockFetch(204, undefined)

    const result = await rest.del('/recipes/7')

    expect(result).toBeUndefined()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/v1/recipes/7')
    expect(init?.method).toBe('DELETE')
  })

  it('postBinary sends the raw blob with its own content type', async () => {
    const fetchSpy = mockFetch(201, { id: 3, hash: 'abc', name: null })
    const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' })

    const result = await rest.postBinary<{ id: number }>('/images', file)

    expect(result).toEqual({ id: 3, hash: 'abc', name: null })
    const [, init] = fetchSpy.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('image/png')
    expect(init?.body).toBe(file)
  })

  it('throws the backend error message', async () => {
    mockFetch(422, { error: { message: 'Recipe name must not be empty' } })
    await expect(rest.put('/recipes/7', {})).rejects.toThrow('Recipe name must not be empty')
  })
})
