import { describe, expect, it } from 'vitest'
import { mockData, mockRequest, CURRENT_USER_ID } from './index'
import type { CreateRecipe, Recipe } from '../api/protocol'

const input: CreateRecipe = {
  name: 'Testrezept',
  tags: [],
  source: null,
  time: null,
  workMinutes: 10,
  overallMinutes: 20,
  sizeNumber: 2,
  sizeText: '{Portionen}',
  notes: [],
  mainImage: null,
  images: [],
  sections: [{ name: null, ingredients: [], steps: ['Umrühren.'] }],
}

describe('mock writes', () => {
  it('creates a recipe owned by the current user and makes it gettable', async () => {
    const created = (await mockRequest('recipes.create', { input })) as Recipe

    expect(created.id).toBeGreaterThan(0)
    expect(created.owner).toBe(CURRENT_USER_ID)
    expect(created.name).toBe('Testrezept')
    expect(created.sections[0].steps).toEqual(['Umrühren.'])

    const fetched = (await mockRequest('recipes.get', { id: created.id })) as Recipe
    expect(fetched.name).toBe('Testrezept')
  })

  it('updates in place and keeps the id', async () => {
    const created = (await mockRequest('recipes.create', { input })) as Recipe

    const updated = (await mockRequest('recipes.update', {
      id: created.id,
      input: { ...input, name: 'Umbenannt' },
    })) as Recipe

    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('Umbenannt')
    expect(mockData.recipes.filter((r) => r.id === created.id)).toHaveLength(1)
  })

  it('rejects an update of an unknown recipe', async () => {
    await expect(mockRequest('recipes.update', { id: 9999, input })).rejects.toThrow(/not found/)
  })

  it('uploads an image and returns a fresh id', async () => {
    const first = (await mockRequest('images.upload')) as { id: number }
    const second = (await mockRequest('images.upload')) as { id: number }
    expect(second.id).toBeGreaterThan(first.id)
  })
})
