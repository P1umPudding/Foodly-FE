import type { Recipe, UserId, UserCategory, Ingredient } from '../api/protocol'
import type { ListState } from './state'
import { roleOf, collaborationState, type Role, type Collaboration } from '../api/views'
import { filterRecipes } from './filter'

export function roleCellKey(role: Role, collab: Collaboration): string {
  return `${role}|${collab}`
}

// Faceted: apply every facet EXCEPT the role/collab axes, then bucket survivors
// into role×collab cells. Lets the UI show "0" for a valid-but-empty cell.
export function roleGridCounts(
  recipes: Recipe[],
  state: ListState,
  currentUserId: UserId | null,
  categories: UserCategory[],
): Record<string, number> {
  const withoutRoleCollab: ListState = { ...state, role: 'any', collab: 'any' }
  const survivors = filterRecipes(recipes, withoutRoleCollab, currentUserId, categories)
  const counts: Record<string, number> = {}
  for (const r of survivors) {
    if (currentUserId === null) continue
    const key = roleCellKey(roleOf(r, currentUserId), collaborationState(r))
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function usedIngredients(recipes: Recipe[], ingredientsById: Record<number, Ingredient>): Ingredient[] {
  const used = new Set<number>()
  for (const r of recipes)
    for (const s of r.sections)
      for (const i of s.ingredients) {
        if (i.ingredient) used.add(i.ingredient.id)
      }
  return [...used]
    .map((id) => ingredientsById[id])
    .filter((ing): ing is Ingredient => Boolean(ing))
    .sort((a, b) => a.name.localeCompare(b.name))
}
