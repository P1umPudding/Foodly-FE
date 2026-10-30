// REST-mode stub branches for ratings (Backend #11). Each load() is a fresh
// module graph, which is how a page reload looks to src/api.
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import type { RecipePreview } from './protocol'

const ME = 7

function preview(id: number, rating: RecipePreview['rating'] = []): RecipePreview {
  return {
    id,
    owner: ME,
    editors: [],
    viewers: [],
    name: `R${id}`,
    tags: [],
    source: null,
    rating,
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: null,
    sizeText: null,
    mainImage: null,
  }
}

function json(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

let fetchSpy: MockInstance<typeof fetch>

beforeEach(() => {
  localStorage.clear()
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.endsWith('/users/me')) return json({ id: ME, name: 'Me', profilePicture: null })
    if (url.includes('/recipes/search')) return json({ data: [preview(1), preview(2), preview(3)], cursor: null })
    if (url.endsWith('/recipes/5'))
      return json({ ...preview(5, [{ user: 3, rating: 2 }]), sections: [], notes: [], images: [] })
    throw new Error(`unexpected fetch ${url}`)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

async function load() {
  vi.stubEnv('VITE_MOCK', '')
  vi.resetModules()
  const [{ foodly }, stubs] = await Promise.all([import('./index'), import('./stubs')])
  return { foodly, stubs }
}

describe('REST rating stub', () => {
  it('merges nothing before me() is known', async () => {
    localStorage.setItem('foodly.stub.ratings', JSON.stringify({ [ME]: { 5: 4 } }))
    const { foodly } = await load()
    const recipe = await foodly.getRecipe(5)
    expect(recipe.rating).toEqual([{ user: 3, rating: 2 }])
  })

  it('sets a rating, merges it next to other users and stores it per user', async () => {
    const { foodly, stubs } = await load()
    await foodly.me()
    expect(stubs.stubUserId()).toBe(ME)

    const updated = await foodly.setMyRating(5, 4)
    expect(updated.rating).toEqual([
      { user: 3, rating: 2 },
      { user: ME, rating: 4 },
    ])
    expect(JSON.parse(localStorage.getItem('foodly.stub.ratings')!)).toEqual({ [ME]: { 5: 4 } })
  })

  it('keeps a set and a cleared rating across a reload', async () => {
    let { foodly } = await load()
    await foodly.me()
    await foodly.setMyRating(5, 4)
    ;({ foodly } = await load())
    await foodly.me()
    expect((await foodly.getRecipe(5)).rating).toContainEqual({ user: ME, rating: 4 })

    const cleared = await foodly.clearMyRating(5)
    expect(cleared.rating).toEqual([{ user: 3, rating: 2 }])
    ;({ foodly } = await load())
    await foodly.me()
    expect((await foodly.getRecipe(5)).rating).toEqual([{ user: 3, rating: 2 }])
    expect(JSON.parse(localStorage.getItem('foodly.stub.ratings')!)[ME]).not.toHaveProperty('5')
  })

  it('merges into search results and re-sorts a rating sort per page', async () => {
    localStorage.setItem('foodly.stub.ratings', JSON.stringify({ [ME]: { 2: 3, 3: 5 } }))
    const { foodly } = await load()
    await foodly.me()

    const page = await foodly.searchRecipes({ sort: { field: 'rating', order: 'desc' } }, 1)
    expect(page.items.map((r) => r.id)).toEqual([3, 2, 1])
    expect(page.items[0].rating).toEqual([{ user: ME, rating: 5 }])

    const byName = await foodly.searchRecipes({ sort: { field: 'name', order: 'asc' } }, 1)
    expect(byName.items.map((r) => r.id)).toEqual([1, 2, 3])
  })

  it('rejects invalid ratings without storing anything', async () => {
    const { foodly } = await load()
    await foodly.me()
    await expect(foodly.setMyRating(5, 6)).rejects.toThrow()
    expect(localStorage.getItem('foodly.stub.ratings')).toBeNull()
  })

  it('forgets the stub user when me() fails', async () => {
    const { foodly, stubs } = await load()
    await foodly.me()
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) } as unknown as Response)
    await expect(foodly.me()).rejects.toThrow()
    expect(stubs.stubUserId()).toBeNull()
  })

  it('never writes ratings to the backend', async () => {
    const { foodly } = await load()
    await foodly.me()
    await foodly.setMyRating(5, 4)
    await foodly.clearMyRating(5)
    for (const [input, init] of fetchSpy.mock.calls) {
      expect(String(input)).not.toMatch(/ratings/)
      expect(init?.method ?? 'GET').toBe('GET')
    }
  })
})
