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
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

export const recipeTagIds = (r: Recipe): string[] => r.tags

export function recipeIngredientIds(r: Recipe): number[] {
  const ids: number[] = []
  for (const s of r.sections)
    for (const i of s.ingredients) {
      if (i.ingredient) ids.push(i.ingredient.id)
    }
  return ids
}

// Most used first, counted once per recipe. Ties (and an empty `recipes`) keep the input order, so the caller's
// order is the fallback: the paged list may not have loaded anything yet.
export function byFrequency<T, K>(
  items: T[],
  recipes: Recipe[],
  keysOf: (r: Recipe) => Iterable<K>,
  keyOf: (item: T) => K,
): T[] {
  const counts = new Map<K, number>()
  for (const r of recipes) for (const k of new Set(keysOf(r))) counts.set(k, (counts.get(k) ?? 0) + 1)
  return [...items].sort((a, b) => (counts.get(keyOf(b)) ?? 0) - (counts.get(keyOf(a)) ?? 0))
}
