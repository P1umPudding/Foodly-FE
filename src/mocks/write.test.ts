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

  it('preserves editors/viewers/rating across a full-replace update', async () => {
    const created = (await mockRequest('recipes.create', { input })) as Recipe

    // CreateRecipe has no editors/viewers/rating fields, so an update has to
    // carry them over from the stored recipe rather than get them from input.
    const stored = mockData.recipes.find((r) => r.id === created.id)!
    stored.editors = [2]
    stored.viewers = [3]
    stored.rating = [{ user: 4, rating: 5 }]

    const updated = (await mockRequest('recipes.update', {
      id: created.id,
      input: { ...input, name: 'Umbenannt' },
    })) as Recipe

    expect(updated.editors).toEqual([2])
    expect(updated.viewers).toEqual([3])
    expect(updated.rating).toEqual([{ user: 4, rating: 5 }])
  })

  it('resolves catalog ingredients and preserves free-text lines', async () => {
    const withIngredients: CreateRecipe = {
      ...input,
      sections: [
        {
          name: null,
          steps: [],
          ingredients: [
            { ingredient: 1, text: null, amount: null, amountPrefix: null, unit: null },
            { ingredient: null, text: 'etwas Freitext', amount: null, amountPrefix: null, unit: null },
          ],
        },
      ],
    }

    const created = (await mockRequest('recipes.create', { input: withIngredients })) as Recipe

    const [resolved, freeText] = created.sections[0].ingredients
    expect(resolved.ingredient).toEqual({ id: 1, name: 'Spaghetti' })
    expect(freeText.ingredient).toBeNull()
    expect(freeText.text).toBe('etwas Freitext')
  })
})
