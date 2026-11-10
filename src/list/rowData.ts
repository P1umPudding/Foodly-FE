// Per-row derived data for the recipe list: which category dots a row shows and
// whether the detailed view needs an image column at all.

import { showsRecipeImages } from '../api/assets'
import type { Recipe, UserCategory, UserCategoryId } from '../api/protocol'

// `exceptId` drops the category whose group the row sits in — the group line already says it.
export function recipeCategories(
  recipe: Recipe,
  categories: UserCategory[],
  exceptId: UserCategoryId | null = null,
): UserCategory[] {
  return categories
    .filter((c) => c.id !== exceptId && c.recipes.includes(recipe.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

// The page passes every loaded recipe, not just the visible ones, so the column doesn't
// flicker while filtering. In REST no photo is displayable yet (FE #144).
export function hasDisplayableImages(recipes: Recipe[]): boolean {
  return showsRecipeImages() && recipes.some((r) => r.mainImage !== null)
}
