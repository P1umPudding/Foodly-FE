// The shell's navigation model: which destinations exist and how nav links address the recipe list.
import { BookOpen, House, type LucideIcon } from 'lucide-react'
import { DEFAULT_STATE, type ListState } from '../../list/state'
import { fromSearchParams, toSearchParams } from '../../list/url'

export type NavDestination = { label: string; path: string; icon: LucideIcon; hidden?: boolean }

// Single source for sidebar and tab bar. The shell shows only real destinations: Start stays hidden
// until the dashboard issue switches it on (`/` redirects to the list until then).
export const NAV_DESTINATIONS: NavDestination[] = [
  { label: 'Start', path: '/', icon: House, hidden: true },
  { label: 'Rezepte', path: '/recipes', icon: BookOpen },
]

export function visibleDestinations(): NavDestination[] {
  return NAV_DESTINATIONS.filter((d) => !d.hidden)
}

export type ViewPrefs = Pick<ListState, 'sortKey' | 'sortDir' | 'detail' | 'grouped'>

// The user's view prefs, which nav links carry over: from the URL while the (already hydrated) list is
// open, otherwise from the persisted list state.
export function navPrefs(pathname: string, params: URLSearchParams, persisted: Partial<ListState> | null): ViewPrefs {
  const source = pathname === '/recipes' ? fromSearchParams(params) : { ...DEFAULT_STATE, ...persisted }
  const { sortKey, sortDir, detail, grouped } = source
  return { sortKey, sortDir, detail, grouped }
}

// A nav link means "these categories" (or "all recipes"), so it drops the other filters but keeps the
// view prefs. `group` is always written: a bare /recipes would make the list restore the last stored
// filters instead of showing all recipes.
export function listHref(categories: number[], prefs: ViewPrefs): string {
  const params = toSearchParams({ ...DEFAULT_STATE, ...prefs, categories })
  params.set('group', prefs.grouped ? '1' : '0')
  return `/recipes?${params.toString()}`
}

// The category the list shows on its own, if any — that link is the active nav entry then, not "Rezepte".
export function activeCategoryId(pathname: string, params: URLSearchParams): number | null {
  if (pathname !== '/recipes') return null
  const { categories } = fromSearchParams(params)
  return categories.length === 1 ? categories[0] : null
}

export function routeTitle(pathname: string): string {
  if (pathname === '/recipes') return 'Rezepte'
  if (pathname === '/recipes/new') return 'Neues Rezept'
  if (/^\/recipes\/[^/]+\/edit$/.test(pathname)) return 'Rezept bearbeiten'
  if (/^\/recipes\/[^/]+$/.test(pathname)) return 'Rezept'
  return ''
}

// Router state on sidebar/tab-bar links, so the list can tell a fresh "open this list" from its own
// filter changes (which keep the scroll position).
export const SHELL_NAV_STATE = { shellNav: true } as const

export function isShellNavState(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { shellNav?: unknown }).shellNav === true
}
