import type { Recipe, UserCategory } from '../api/protocol'
import type { CategoryColorInput } from '../lib/categoryColor'

// `colors` is null for "Ohne Kategorie", which keeps the neutral theme defaults.
export type RecipeGroup = { key: string; name: string; colors: CategoryColorInput | null; recipes: Recipe[] }

// Split recipes into a leading "Ohne Kategorie" bucket (collapsed by default — an
// inbox of recipes still to be sorted) followed by the ordered category groups.
// Shared by the list view (rendering) and the page (collapse-all state), so the
// group keys match on both sides.
export function deriveGroups(recipes: Recipe[], categories: UserCategory[]): RecipeGroup[] {
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const inAnyCategory = new Set<number>()
  for (const c of categories) for (const id of c.recipes) inAnyCategory.add(id)

  const groups: RecipeGroup[] = []
  const uncategorised = recipes.filter((r) => !inAnyCategory.has(r.id))
  if (uncategorised.length > 0) {
    groups.push({ key: 'uncat', name: 'Ohne Kategorie', colors: null, recipes: uncategorised })
  }
  for (const c of ordered) {
    const inThis = recipes.filter((r) => c.recipes.includes(r.id))
    if (inThis.length === 0) continue
    const colors = { color: c.color, colorLight: c.colorLight, colorDark: c.colorDark }
    groups.push({ key: `cat-${c.id}`, name: c.name, colors, recipes: inThis })
  }
  return groups
}
