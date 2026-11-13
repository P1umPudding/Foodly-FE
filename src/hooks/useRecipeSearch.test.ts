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

  it('keeps paging state when the next page fails and loads it again on retry', async () => {
    const spy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1)], cursor: 2 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [rec(2)], cursor: null })
    const query: RecipeSearchQuery = { sort: { field: 'name', order: 'asc' } }

    const { result } = renderHook(() => useRecipeSearch(query))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.loadMoreError?.message).toBe('offline'))
    expect(result.current.hasMore).toBe(true)
    expect(result.current.loadingMore).toBe(false)
    expect(result.current.status).toBe('ready')
    expect(result.current.recipes.map((r) => r.id)).toEqual([1])

    // Paused: loadMore must not retry by itself while the error stands.
    act(() => result.current.loadMore())
    expect(spy).toHaveBeenCalledTimes(2)

    act(() => result.current.retryLoadMore())
    expect(result.current.loadMoreError).toBeNull()
    expect(result.current.loadingMore).toBe(true)
    await waitFor(() => expect(result.current.recipes.map((r) => r.id)).toEqual([1, 2]))
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2]?.[1]).toBe(2)
    expect(result.current.hasMore).toBe(false)
    expect(result.current.loadMoreError).toBeNull()
  })

  it('clears a load-more error on query change and on reload', async () => {
    vi.spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1)], cursor: 2 }) // q1 page 1
      .mockRejectedValueOnce(new Error('offline')) // q1 page 2
      .mockResolvedValueOnce({ items: [rec(3)], cursor: 2 }) // q2 page 1
      .mockRejectedValueOnce(new Error('offline')) // q2 page 2
      .mockResolvedValueOnce({ items: [rec(3)], cursor: 2 }) // q2 reload page 1

    const q1: RecipeSearchQuery = { sort: { field: 'name', order: 'asc' } }
    const q2: RecipeSearchQuery = { sort: { field: 'rating', order: 'desc' } }
    const { result, rerender } = renderHook((q) => useRecipeSearch(q), { initialProps: q1 })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.loadMoreError).not.toBeNull())

    rerender(q2)
    await waitFor(() => expect(result.current.recipes.map((r) => r.id)).toEqual([3]))
    expect(result.current.loadMoreError).toBeNull()

    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.loadMoreError).not.toBeNull())
    act(() => result.current.reload())
    expect(result.current.loadMoreError).toBeNull()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.loadMoreError).toBeNull()
  })

  it('ignores a load-more failure from a previous query', async () => {
    let rejectStale: (e: Error) => void = () => {}
    const stale = new Promise<PaginatedRecipes>((_, reject) => {
      rejectStale = reject
    })
    vi.spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1)], cursor: 2 }) // q1 page 1
      .mockReturnValueOnce(stale) // q1 page 2 — fails after the query changed
      .mockResolvedValueOnce({ items: [rec(3)], cursor: 2 }) // q2 page 1

    const q1: RecipeSearchQuery = { sort: { field: 'name', order: 'asc' } }
    const q2: RecipeSearchQuery = { sort: { field: 'rating', order: 'desc' } }
    const { result, rerender } = renderHook((q) => useRecipeSearch(q), { initialProps: q1 })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.loadMore())
    rerender(q2)
    await waitFor(() => expect(result.current.recipes.map((r) => r.id)).toEqual([3]))

    await act(async () => {
      rejectStale(new Error('offline'))
      await stale.catch(() => {})
    })
    expect(result.current.loadMoreError).toBeNull()
    expect(result.current.hasMore).toBe(true)
  })

  it('drops a retry still in flight when the query changes', async () => {
    let releaseRetry: (res: PaginatedRecipes) => void = () => {}
    const retry = new Promise<PaginatedRecipes>((resolve) => {
      releaseRetry = resolve
    })
    vi.spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1)], cursor: 2 }) // q1 page 1
      .mockRejectedValueOnce(new Error('offline')) // q1 page 2
      .mockReturnValueOnce(retry) // q1 page 2 retry — settles after the query changed
      .mockResolvedValueOnce({ items: [rec(3)], cursor: null }) // q2 page 1

    const q1: RecipeSearchQuery = { sort: { field: 'name', order: 'asc' } }
    const q2: RecipeSearchQuery = { sort: { field: 'rating', order: 'desc' } }
    const { result, rerender } = renderHook((q) => useRecipeSearch(q), { initialProps: q1 })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.loadMoreError).not.toBeNull())
    act(() => result.current.retryLoadMore())
    rerender(q2)
    await waitFor(() => expect(result.current.recipes.map((r) => r.id)).toEqual([3]))

    await act(async () => {
      releaseRetry({ items: [rec(2)], cursor: 9 })
      await retry
    })
    expect(result.current.recipes.map((r) => r.id)).toEqual([3])
    expect(result.current.loadMoreError).toBeNull()
    expect(result.current.loadingMore).toBe(false)
    expect(result.current.hasMore).toBe(false)
  })

  it('starts one request when loadMore is called twice before re-rendering, then pages on', async () => {
    const spy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1)], cursor: 2 })
      .mockResolvedValueOnce({ items: [rec(2)], cursor: 3 })
      .mockResolvedValueOnce({ items: [rec(3)], cursor: null })

    const { result } = renderHook(() => useRecipeSearch({ sort: { field: 'name', order: 'asc' } }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    // Both callers hold the same render's loadMore (the list's sentinel and its scroll restore).
    const { loadMore } = result.current
    act(() => {
      loadMore()
      loadMore()
    })
    await waitFor(() => expect(result.current.recipes.map((r) => r.id)).toEqual([1, 2]))
    expect(spy).toHaveBeenCalledTimes(2)

    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.recipes.map((r) => r.id)).toEqual([1, 2, 3]))
    expect(spy).toHaveBeenNthCalledWith(3, expect.anything(), 3)
  })
})
