import { describe, it, expect } from 'vitest'
import { deriveGroups } from './grouping'
import type { Recipe, UserCategory } from '../api/protocol'

const recipe = (id: number): Recipe =>
  ({ id, name: `r${id}`, owner: 1, editors: [], viewers: [], tags: [], sections: [] }) as unknown as Recipe

const cat = (id: number, name: string, recipes: number[], order: number): UserCategory =>
  ({ id, name, recipes, order, color: '#e11d48', colorLight: null, colorDark: null }) as unknown as UserCategory

describe('deriveGroups', () => {
  it('leads with "Ohne Kategorie" for leftovers, then ordered categories', () => {
    const recipes = [recipe(1), recipe(2), recipe(3)]
    const cats = [cat(20, 'B', [2], 2), cat(10, 'A', [1], 1)]
    const groups = deriveGroups(recipes, cats)
    expect(groups.map((g) => g.key)).toEqual(['uncat', 'cat-10', 'cat-20'])
    expect(groups[0].recipes.map((r) => r.id)).toEqual([3]) // recipe 3 is uncategorised
  })

  it('drops categories with no matching recipes', () => {
    const groups = deriveGroups([recipe(1)], [cat(10, 'A', [1], 1), cat(11, 'Empty', [99], 2)])
    expect(groups.map((g) => g.key)).toEqual(['cat-10'])
  })

  it('returns no "uncat" group when everything is categorised', () => {
    const groups = deriveGroups([recipe(1)], [cat(10, 'A', [1], 1)])
    expect(groups.some((g) => g.key === 'uncat')).toBe(false)
  })

  it('carries the category colours, none for "Ohne Kategorie"', () => {
    const c = { ...cat(10, 'A', [1], 1), colorLight: '#ff0000' }
    const groups = deriveGroups([recipe(1), recipe(2)], [c])
    expect(groups[0].colors).toBeNull()
    expect(groups[1].colors).toEqual({ color: c.color, colorLight: '#ff0000', colorDark: null })
  })
})
