import { hasDisplayableImages, recipeCategories } from './rowData'
import type { Recipe, UserCategory } from '../api/protocol'
import { ref } from '../test/images'

const recipe = { id: 1, mainImage: null } as Recipe

function cat(id: number, order: number | null, recipes: number[] = [1]): UserCategory {
  return { id, user: 1, name: `C${id}`, recipes, order, color: '#000', colorLight: null, colorDark: null }
}

describe('recipeCategories', () => {
  it('returns nothing for a recipe in no category', () => {
    expect(recipeCategories(recipe, [])).toEqual([])
    expect(recipeCategories(recipe, [cat(1, 0, [2])])).toEqual([])
  })

  it('returns the one category', () => {
    expect(recipeCategories(recipe, [cat(1, 0), cat(2, 1, [2])]).map((c) => c.id)).toEqual([1])
  })

  it('sorts by order, null counting as 0, stable on ties', () => {
    const cats = [cat(1, 3), cat(2, null), cat(3, 1), cat(4, 0)]
    expect(recipeCategories(recipe, cats).map((c) => c.id)).toEqual([2, 4, 3, 1])
  })

  it('drops the excepted category', () => {
    const cats = [cat(1, 0), cat(2, 1), cat(3, 2), cat(4, 3)]
    expect(recipeCategories(recipe, cats, 3).map((c) => c.id)).toEqual([1, 2, 4])
  })
})

describe('hasDisplayableImages', () => {
  const withPhoto = { ...recipe, id: 2, mainImage: ref(5) } as Recipe

  it('is false when no recipe has a photo', () => {
    expect(hasDisplayableImages([recipe])).toBe(false)
    expect(hasDisplayableImages([])).toBe(false)
  })

  it('is true when one recipe has a photo', () => {
    expect(hasDisplayableImages([recipe, withPhoto])).toBe(true)
  })
})
