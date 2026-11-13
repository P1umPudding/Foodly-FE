// Own file on purpose: other mock tests copy recipes into the shared mockData, and a copy is the newest own recipe.
import { describe, expect, it } from 'vitest'
import { CURRENT_USER_ID, mockData, mockRequest } from './index'
import type { PaginatedRecipes } from '../api/protocol'

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?\+00:00$/

describe('mock recipe timestamps', () => {
  it('gives every recipe the three timestamps in the backend format', () => {
    for (const r of mockData.recipes) {
      expect(r.createdAt).toMatch(ISO)
      expect(r.updatedAt).toMatch(ISO)
      expect(r.myAccessSince).toMatch(ISO)
      expect(r.updatedAt! >= r.createdAt!).toBe(true)
      if (r.owner === CURRENT_USER_ID) expect(r.myAccessSince).toBe(r.createdAt)
    }
  })

  it('gives own recipes distinct creation times', () => {
    const own = mockData.recipes.filter((r) => r.owner === CURRENT_USER_ID).map((r) => r.createdAt)
    expect(new Set(own).size).toBe(own.length)
  })
})

describe('mock search: own recipes, newest first', () => {
  it('returns only own recipes, newest first', async () => {
    const page = (await mockRequest('recipes.search', {
      query: { filters: { accessRights: ['owner'] }, sort: { field: 'accessSince', order: 'desc' } },
      page: 1,
    })) as PaginatedRecipes

    expect(page.items.map((r) => r.id)).toEqual([12, 4, 13, 1, 8, 6, 2, 10, 5])
    expect(page.items.every((r) => r.owner === CURRENT_USER_ID)).toBe(true)
  })
})
