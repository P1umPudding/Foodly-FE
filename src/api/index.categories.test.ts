import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { foodly } from './index'
import { jsonResponse, seedSession } from '../test/auth'
import type { UserCategory } from './protocol'

// The mode is read when the modules load, so pin REST before the imports run.
vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))
afterAll(() => vi.unstubAllEnvs())

const category: UserCategory = {
  id: 3,
  user: 1,
  name: 'Suppen',
  recipes: [5],
  order: 2,
  color: '#16a34a',
  colorLight: null,
  colorDark: null,
}
const input = { name: 'Suppen', color: '#16a34a', colorLight: '#dcfce7', colorDark: null }

beforeEach(() => {
  seedSession()
})
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

function respond(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(status, body))
}

function sent(fetchSpy: ReturnType<typeof respond>) {
  const [url, init] = fetchSpy.mock.calls[0]
  return { url, method: init?.method, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) }
}

describe('category writes over REST', () => {
  it('createCategory posts the input and resolves the category', async () => {
    const fetchSpy = respond(200, category)
    await expect(foodly.createCategory(input)).resolves.toEqual(category)
    expect(sent(fetchSpy)).toEqual({ url: '/api/v1/categories', method: 'POST', body: input })
  })

  it('updateCategory puts the whole input', async () => {
    const fetchSpy = respond(200, category)
    await expect(foodly.updateCategory(3, input)).resolves.toEqual(category)
    expect(sent(fetchSpy)).toEqual({
      url: '/api/v1/categories/3',
      method: 'PUT',
      body: { name: 'Suppen', color: '#16a34a', colorLight: '#dcfce7', colorDark: null },
    })
  })

  it('deleteCategory sends DELETE and resolves undefined', async () => {
    const fetchSpy = respond(204)
    await expect(foodly.deleteCategory(3)).resolves.toBeUndefined()
    expect(sent(fetchSpy)).toEqual({ url: '/api/v1/categories/3', method: 'DELETE', body: undefined })
  })

  it('setCategoryRecipes puts the recipe ids', async () => {
    const fetchSpy = respond(200, { ...category, recipes: [7, 5] })
    await expect(foodly.setCategoryRecipes(3, [7, 5])).resolves.toEqual({ ...category, recipes: [7, 5] })
    expect(sent(fetchSpy)).toEqual({ url: '/api/v1/categories/3/recipes', method: 'PUT', body: { recipeIds: [7, 5] } })
  })

  it('reorderCategories puts the category ids and ignores the answer', async () => {
    const fetchSpy = respond(200, {
      data: [
        { id: 2, order: 0 },
        { id: 1, order: 1 },
      ],
    })
    await expect(foodly.reorderCategories([2, 1])).resolves.toBeUndefined()
    expect(sent(fetchSpy)).toEqual({ url: '/api/v1/categories/order', method: 'PUT', body: { categoryIds: [2, 1] } })
  })

  it('throws the backend error message', async () => {
    respond(422, { error: { message: 'name must not be empty' } })
    await expect(foodly.createCategory({ ...input, name: '' })).rejects.toThrow('name must not be empty')
  })
})
