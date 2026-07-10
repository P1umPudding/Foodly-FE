import type { Recipe, UserId, UserCategory } from '../api/protocol'

// Sentinel category id for "Ohne Kategorie" (uncategorised). Real category ids are
// positive, so 0 can't collide. Selecting it OR-includes recipes in no category.
export const UNCATEGORIZED_ID = 0

// When the category facet is active, by-category grouping should show only the
// selected categories; otherwise all. (Sidebar still shows all categories.)
export function groupingCategories(categories: UserCategory[], selected: number[]): UserCategory[] {
  return selected.length > 0 ? categories.filter((c) => selected.includes(c.id)) : categories
}
import type { ListState } from './state'
import { roleOf, collaborationState } from '../api/views'
import { matchesSearch } from './search'

function isUncategorised(recipe: Recipe, categories: UserCategory[]): boolean {
  return !categories.some((c) => c.recipes.includes(recipe.id))
}

export function inSelectedCategory(recipe: Recipe, selected: number[], categories: UserCategory[]): boolean {
  if (selected.length === 0) return true // facet inactive
  if (selected.includes(UNCATEGORIZED_ID) && isUncategorised(recipe, categories)) return true
  return categories.some((c) => selected.includes(c.id) && c.recipes.includes(recipe.id))
}

function hasAllTags(recipe: Recipe, tags: string[]): boolean {
  return tags.every((t) => recipe.tags.includes(t))
}

function recipeIngredientIds(recipe: Recipe): Set<number> {
  const out = new Set<number>()
  for (const s of recipe.sections) for (const i of s.ingredients) if (i.ingredient) out.add(i.ingredient.id)
  return out
}

function hasAllIngredients(recipe: Recipe, ingredients: number[]): boolean {
  if (ingredients.length === 0) return true
  const have = recipeIngredientIds(recipe)
  return ingredients.every((id) => have.has(id))
}

function withinDuration(recipe: Recipe, max: number | null): boolean {
  if (max === null) return true
  return recipe.workMinutes !== null && recipe.workMinutes <= max // unknown (null) excluded
}

export function filterRecipes(
  recipes: Recipe[],
  state: ListState,
  currentUserId: UserId | null,
  categories: UserCategory[],
): Recipe[] {
  return recipes.filter(
    (recipe) =>
      inSelectedCategory(recipe, state.categories, categories) &&
      hasAllTags(recipe, state.tags) &&
      hasAllIngredients(recipe, state.ingredients) &&
      withinDuration(recipe, state.durationMax) &&
      (state.role === 'any' || (currentUserId !== null && roleOf(recipe, currentUserId) === state.role)) &&
      (state.collab === 'any' || collaborationState(recipe) === state.collab) &&
      matchesSearch(recipe, state.search),
  )
}
