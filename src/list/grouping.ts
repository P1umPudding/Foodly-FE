import type { Recipe, UserCategory } from '../api/protocol'

export type RecipeGroup = { key: string; name: string; color: string; recipes: Recipe[] }

// Split recipes into ordered category groups plus a trailing "Ohne Kategorie".
// Shared by the list view (rendering) and the page (collapse-all state), so the
// group keys match on both sides.
export function deriveGroups(recipes: Recipe[], categories: UserCategory[]): RecipeGroup[] {
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const inAnyCategory = new Set<number>()
  for (const c of categories) for (const id of c.recipes) inAnyCategory.add(id)

  const groups: RecipeGroup[] = []
  for (const c of ordered) {
    const inThis = recipes.filter((r) => c.recipes.includes(r.id))
    if (inThis.length > 0) groups.push({ key: `cat-${c.id}`, name: c.name, color: c.color, recipes: inThis })
  }
  const uncategorised = recipes.filter((r) => !inAnyCategory.has(r.id))
  if (uncategorised.length > 0) {
    groups.push({ key: 'uncat', name: 'Ohne Kategorie', color: '', recipes: uncategorised })
  }
  return groups
}
