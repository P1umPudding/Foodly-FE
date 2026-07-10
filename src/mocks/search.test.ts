import { describe, expect, it } from 'vitest'
import { mockRequest } from './index'
import type { PaginatedRecipes } from '../api/protocol'

describe('mock recipes.search', () => {
  it('returns a page and a copy handler that suffixes the name', async () => {
    const page = (await mockRequest('recipes.search', {
      query: { sort: { field: 'name', order: 'asc' } },
      page: 1,
    })) as PaginatedRecipes
    expect(Array.isArray(page.items)).toBe(true)
    expect(page.items.length).toBeGreaterThan(0)

    const first = page.items[0]
    const copy = (await mockRequest('recipes.copy', { id: first.id })) as { id: number; name: string; owner: number }
    expect(copy.id).not.toBe(first.id)
    expect(copy.name).toContain('(Kopie)')
    expect(copy.owner).toBe(1)
  })
})
