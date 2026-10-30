import { describe, expect, it } from 'vitest'
import { mockData, mockRequest, CURRENT_USER_ID } from './index'
import type { Recipe } from '../api/protocol'

const target = mockData.recipes[0]

describe('mock ratings', () => {
  it('sets, overwrites and clears the own rating, keeping other users', async () => {
    const others = target.rating.filter((r) => r.user !== CURRENT_USER_ID)

    let out = (await mockRequest('ratings.set', { id: target.id, rating: 3 })) as Recipe
    expect(out.rating).toContainEqual({ user: CURRENT_USER_ID, rating: 3 })

    out = (await mockRequest('ratings.set', { id: target.id, rating: 5 })) as Recipe
    expect(out.rating.filter((r) => r.user === CURRENT_USER_ID)).toEqual([{ user: CURRENT_USER_ID, rating: 5 }])
    expect(((await mockRequest('recipes.get', { id: target.id })) as Recipe).rating).toContainEqual({
      user: CURRENT_USER_ID,
      rating: 5,
    })

    out = (await mockRequest('ratings.clear', { id: target.id })) as Recipe
    expect(out.rating).toEqual(others)
  })

  it('rejects ratings outside whole 1–5 stars', async () => {
    await expect(mockRequest('ratings.set', { id: target.id, rating: 0 })).rejects.toThrow()
    await expect(mockRequest('ratings.set', { id: target.id, rating: 4.5 })).rejects.toThrow()
  })

  it('rejects unknown recipes', async () => {
    await expect(mockRequest('ratings.set', { id: -1, rating: 3 })).rejects.toThrow('not found')
    await expect(mockRequest('ratings.clear', { id: -1 })).rejects.toThrow('not found')
  })
})
