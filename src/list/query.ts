// Maps the frontend ListState to the backend RecipeSearchQuery (server-side
// filter/sort), and — for VITE_MOCK dev — applies the same query to an in-memory
// recipe list so mock mode filters/sorts like the real backend.

import type { ListState } from './state'
import type {
  Recipe,
  RecipeAccessRight,
  RecipeSearchQuery,
  RecipeShareStateWire,
  RecipeSortField,
} from '../api/protocol'
import { averageRating, collaborationState, roleOf } from '../api/views'

export const PAGE_SIZE = 100

const SORT_FIELD: Record<ListState['sortKey'], RecipeSortField> = {
  name: 'name',
  work: 'worktime',
  overall: 'totaltime',
  rating: 'rating',
}

export function buildSearchQuery(state: ListState): RecipeSearchQuery {
  const filters: NonNullable<RecipeSearchQuery['filters']> = {}
  if (state.tags.length) filters.tags = state.tags
  if (state.ingredients.length) filters.ingredients = state.ingredients
  if (state.durationMax !== null) filters.maxWorkTime = state.durationMax
  if (state.role !== 'any') filters.accessRights = [state.role as RecipeAccessRight]
  if (state.collab !== 'any') filters.shareStates = [state.collab as RecipeShareStateWire]
  // Category facet is intentionally NOT sent: categories are still mocked, so
  // their ids don't map to real backend categories — sending them would filter
  // the real list to empty. (Grouping-by-category stays a client-only view.)

  const query: RecipeSearchQuery = { sort: { field: SORT_FIELD[state.sortKey], order: state.sortDir } }
  if (Object.keys(filters).length > 0) query.filters = filters
  return query
}

function recipeIngredientIds(recipe: Recipe): Set<number> {
  const ids = new Set<number>()
  for (const section of recipe.sections)
    for (const line of section.ingredients) if (line.ingredient) ids.add(line.ingredient.id)
  return ids
}

function sortValue(recipe: Recipe, field: RecipeSortField): number | string | null {
  switch (field) {
    case 'name':
      return recipe.name.toLowerCase()
    case 'worktime':
      return recipe.workMinutes
    case 'totaltime':
      return recipe.overallMinutes
    case 'rating':
      return averageRating(recipe)
  }
}

export function applyQuery(recipes: Recipe[], query: RecipeSearchQuery, currentUserId: number | null): Recipe[] {
  let out = recipes
  const f = query.filters
  if (f) {
    if (f.tags?.length) out = out.filter((r) => f.tags!.every((t) => r.tags.includes(t)))
    if (f.ingredients?.length)
      out = out.filter((r) => {
        const have = recipeIngredientIds(r)
        return f.ingredients!.every((id) => have.has(id))
      })
    if (f.maxWorkTime != null) out = out.filter((r) => r.workMinutes !== null && r.workMinutes <= f.maxWorkTime!)
    if (f.accessRights?.length)
      out = out.filter(
        (r) => currentUserId !== null && f.accessRights!.includes(roleOf(r, currentUserId) as RecipeAccessRight),
      )
    if (f.shareStates?.length)
      out = out.filter((r) => f.shareStates!.includes(collaborationState(r) as RecipeShareStateWire))
  }

  const sort = query.sort
  if (sort) {
    const dir = sort.order === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      const va = sortValue(a, sort.field)
      const vb = sortValue(b, sort.field)
      if (va === null && vb === null) return 0
      if (va === null) return 1 // nulls last, both directions
      if (vb === null) return -1
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }
  return out
}
