import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRecipeSearch } from './useRecipeSearch'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

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
})
