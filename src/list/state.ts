// The full filter/search/sort/view state of the recipe list. One object, mirrored
// to the URL (shareable) and localStorage (personal defaults) — see url.ts / persistence.ts.

export type RoleFilter = 'any' | 'owner' | 'editor' | 'viewer'
export type CollabFilter = 'any' | 'private' | 'shared' | 'collaborative'
export type SortKey = 'name' | 'work' | 'overall' | 'rating'
export type SortDir = 'asc' | 'desc'
export type DetailView = 'detailed' | 'compact' | 'tiles'
export const DETAIL_VIEWS: DetailView[] = ['detailed', 'compact', 'tiles']

export interface ListState {
  categories: number[] // OR within this facet
  tags: string[] // AND
  ingredients: number[] // AND (ingredient ids)
  durationMax: number | null // ≤, applied to workMinutes
  role: RoleFilter
  collab: CollabFilter
  search: string
  sortKey: SortKey
  sortDir: SortDir
  detail: DetailView
  grouped: boolean // true = by category, false = one flat list
}

export const DEFAULT_STATE: ListState = {
  categories: [],
  tags: [],
  ingredients: [],
  durationMax: null,
  role: 'any',
  collab: 'any',
  search: '',
  sortKey: 'name',
  sortDir: 'asc',
  detail: 'detailed',
  grouped: true,
}

// A facet = one of the filter-bar filters; the search text is not one.
export function isFacetActive(s: ListState): boolean {
  return (
    s.categories.length > 0 ||
    s.tags.length > 0 ||
    s.ingredients.length > 0 ||
    s.durationMax !== null ||
    s.role !== 'any' ||
    s.collab !== 'any'
  )
}

export function isFilterActive(s: ListState): boolean {
  return isFacetActive(s) || s.search.trim() !== ''
}

export function clearedState(s: ListState): ListState {
  return {
    ...s,
    categories: [],
    tags: [],
    ingredients: [],
    durationMax: null,
    role: 'any',
    collab: 'any',
    search: '',
  }
}
