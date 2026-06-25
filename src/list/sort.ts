import type { Recipe, UserId } from '../api/protocol'
import type { ListState, SortKey } from './state'
import { visibleRating } from '../api/views'

// Numeric/string sort key; null = "unknown" and always sinks to the end.
function sortValue(recipe: Recipe, key: SortKey, currentUserId: UserId | null): number | string | null {
  switch (key) {
    case 'name':
      return recipe.name.toLowerCase()
    case 'work':
      return recipe.workMinutes
    case 'overall':
      return recipe.overallMinutes
    case 'rating':
      return visibleRating(recipe, currentUserId)
  }
}

export function sortRecipes(recipes: Recipe[], state: ListState, currentUserId: UserId | null): Recipe[] {
  const dir = state.sortDir === 'asc' ? 1 : -1
  return [...recipes].sort((a, b) => {
    const va = sortValue(a, state.sortKey, currentUserId)
    const vb = sortValue(b, state.sortKey, currentUserId)
    if (va === null && vb === null) return 0
    if (va === null) return 1 // nulls last, both directions
    if (vb === null) return -1
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
}
