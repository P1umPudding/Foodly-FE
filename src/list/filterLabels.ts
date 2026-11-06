import type { ListState, RoleFilter, CollabFilter } from './state'
import { UNCATEGORIZED_ID } from './filter'
import type { Ingredient, UserCategory } from '../api/protocol'

// Same words as the Zugriff popover (components/list/filters/AccessFilter.tsx).
const ROLE_LABELS: Record<Exclude<RoleFilter, 'any'>, string> = {
  owner: 'Besitzer',
  editor: 'Bearbeiter',
  viewer: 'Betrachter',
}
const COLLAB_LABELS: Record<Exclude<CollabFilter, 'any'>, string> = {
  private: 'Privat',
  shared: 'Geteilt',
  collaborative: 'Kollaborativ',
}

// Tags need no catalog: a tag's id is its name.
export type FilterCatalogs = { categories: UserCategory[]; ingredients: Ingredient[] }

// Value text per filter-bar button, null while the filter is inactive.
export type FilterLabels = {
  category: string | null
  tags: string | null
  ingredients: string | null
  duration: string | null
  access: string | null
}

// First name (in state order, i.e. as picked) plus "+n" for the rest.
function firstPlus(names: string[]): string | null {
  if (names.length === 0) return null
  return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`
}

export function filterLabels(state: ListState, { categories, ingredients }: FilterCatalogs): FilterLabels {
  const catName = (id: number) =>
    id === UNCATEGORIZED_ID ? 'Ohne Kategorie' : (categories.find((c) => c.id === id)?.name ?? `#${id}`)
  const ingName = (id: number) => ingredients.find((i) => i.id === id)?.name ?? `#${id}`
  const access = [
    state.role !== 'any' ? ROLE_LABELS[state.role] : null,
    state.collab !== 'any' ? COLLAB_LABELS[state.collab] : null,
  ].filter((part) => part !== null)

  return {
    category: firstPlus(state.categories.map(catName)),
    tags: firstPlus(state.tags),
    ingredients: firstPlus(state.ingredients.map(ingName)),
    duration: state.durationMax === null ? null : `≤ ${state.durationMax} min`,
    access: access.length > 0 ? access.join(' · ') : null,
  }
}
