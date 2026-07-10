import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRecipeSearch } from './useRecipeSearch'
import { foodly } from '../api'
import type { PaginatedRecipes, Recipe, RecipeSearchQuery } from '../api/protocol'

function rec(id: number): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    name: `r${id}`,
    tags: [],
    source: null,
    rating: [],
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: null,
    sizeText: null,
    notes: [],
    mainImage: null,
    images: [],
    sections: [],
  }
}

afterEach(() => vi.restoreAllMocks())

describe('useRecipeSearch', () => {
  it('loads page 1 then accumulates on loadMore', async () => {
    const spy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1)], cursor: 2 })
      .mockResolvedValueOnce({ items: [rec(2)], cursor: null })

    const { result } = renderHook(() => useRecipeSearch({ sort: { field: 'name', order: 'asc' } }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.recipes.map((r) => r.id)).toEqual([1])
    expect(result.current.hasMore).toBe(true)

    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.recipes.length).toBe(2))
    expect(result.current.recipes.map((r) => r.id)).toEqual([1, 2])
    expect(result.current.hasMore).toBe(false)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('exposes an error status when the request fails', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useRecipeSearch({ sort: { field: 'name', order: 'asc' } }))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toBe('boom')
  })

  it('resets loadingMore on query change so pagination is not left stuck', async () => {
    // The loadMore (2nd) call hangs until we release it, so the query can change
    // while it is still in flight — the scenario that used to strand loadingMore.
    let releaseStale: (res: PaginatedRecipes) => void = () => {}
    const stale = new Promise<PaginatedRecipes>((resolve) => {
      releaseStale = resolve
    })
    const spy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1)], cursor: 2 }) // q1 page 1
      .mockReturnValueOnce(stale) // q1 loadMore — stays pending
      .mockResolvedValueOnce({ items: [rec(3)], cursor: 5 }) // q2 page 1
      .mockResolvedValueOnce({ items: [rec(4)], cursor: null }) // q2 loadMore

    const q1: RecipeSearchQuery = { sort: { field: 'name', order: 'asc' } }
    const q2: RecipeSearchQuery = { sort: { field: 'rating', order: 'desc' } }
    const { result, rerender } = renderHook((q) => useRecipeSearch(q), { initialProps: q1 })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.loadingMore).toBe(true))

    // Query changes while the loadMore request is still pending.
    rerender(q2)
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.recipes.map((r) => r.id)).toEqual([3])
    expect(result.current.loadingMore).toBe(false)

    // The stale loadMore now resolves — must be ignored (epoch bumped).
    await act(async () => {
      releaseStale({ items: [rec(2)], cursor: null })
      await stale
    })
    expect(result.current.recipes.map((r) => r.id)).toEqual([3])

    // Pagination on the new query still works.
    const callsBefore = spy.mock.calls.length
    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.recipes.length).toBe(2))
    expect(result.current.recipes.map((r) => r.id)).toEqual([3, 4])
    expect(spy.mock.calls.length).toBe(callsBefore + 1)
  })
})
