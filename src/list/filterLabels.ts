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

// First name (in state order, i.e. as picked) and how many more are selected. Kept apart so the button
// can truncate the name without ever cutting off the "+n".
export type FilterValue = { first: string; more: number }

// Value per filter-bar button, null while the filter is inactive.
export type FilterLabels = {
  category: FilterValue | null
  tags: FilterValue | null
  ingredients: FilterValue | null
  duration: FilterValue | null
  access: FilterValue | null
}

function firstPlus(names: string[]): FilterValue | null {
  return names.length === 0 ? null : { first: names[0], more: names.length - 1 }
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
    duration: state.durationMax === null ? null : { first: `≤ ${state.durationMax} min`, more: 0 },
    access: access.length > 0 ? { first: access.join(' · '), more: 0 } : null,
  }
}
