// Own file on purpose: other mock tests copy recipes into the shared mockData, and a copy is the newest edited one.
import { describe, expect, it } from 'vitest'
import { CURRENT_USER_ID, mockData, mockRequest } from './index'
import type { PaginatedRecipes } from '../api/protocol'

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/

describe('mock recipe timestamps', () => {
  it('gives every seed recipe the three timestamps (seconds, +00:00)', () => {
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

describe('mock search: last edited first', () => {
  it('returns all recipes user 1 can open by updatedAt, newest first', async () => {
    const page = (await mockRequest('recipes.search', {
      query: { sort: { field: 'updatedAt', order: 'desc' } },
      page: 1,
    })) as PaginatedRecipes

    const times = page.items.map((r) => Date.parse(r.updatedAt!))
    expect(times).toEqual([...times].sort((a, b) => b - a))
    expect(page.items.slice(0, 6).map((r) => r.id)).toEqual([12, 4, 14, 13, 11, 9])
  })
})
