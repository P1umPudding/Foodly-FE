// REST placeholder for sorting by updatedAt (backend #16): the server gets no sort, the page is sorted on the client.
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import type { RecipePreview } from './protocol'

function preview(id: number, updatedAt: string | null): RecipePreview {
  return {
    id,
    owner: 7,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt,
    myAccessSince: null,
    name: `R${id}`,
    tags: [],
    source: null,
    rating: [],
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
    if (url.includes('/recipes/search'))
      return json({
        data: [
          preview(1, '2026-01-01T09:00:00+00:00'),
          preview(2, null),
          preview(3, '2026-03-01T09:00:00+00:00'),
          preview(4, '2026-01-01T09:00:00+00:00'),
        ],
        cursor: null,
      })
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
  return (await import('./index')).foodly
}

const body = () => JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))

describe('REST searchRecipes sorted by updatedAt', () => {
  it('sends no sort and sorts the page newest first, nulls last, ties by id', async () => {
    const foodly = await load()
    const page = await foodly.searchRecipes({ filters: { tags: ['x'] }, sort: { field: 'updatedAt', order: 'desc' } }, 1)
    expect(body()).toEqual({ filters: { tags: ['x'] } })
    expect(page.items.map((r) => r.id)).toEqual([3, 1, 4, 2])
  })

  it('passes other sorts to the server unchanged', async () => {
    const foodly = await load()
    const page = await foodly.searchRecipes({ sort: { field: 'name', order: 'asc' } }, 1)
    expect(body()).toEqual({ sort: { field: 'name', order: 'asc' } })
    expect(page.items.map((r) => r.id)).toEqual([1, 2, 3, 4])
  })
})
