// The shell's navigation model: which destinations exist and how nav links address the recipe list.
import { BookOpen, House, type LucideIcon } from 'lucide-react'
import { DEFAULT_STATE, type ListState, type RoleFilter } from '../../list/state'
import { fromSearchParams, toSearchParams } from '../../list/url'

export type NavDestination = { label: string; path: string; icon: LucideIcon }

// Single source for sidebar and tab bar.
export const NAV_DESTINATIONS: NavDestination[] = [
  { label: 'Start', path: '/', icon: House },
  { label: 'Rezepte', path: '/recipes', icon: BookOpen },
]

export type ViewPrefs = Pick<ListState, 'sortKey' | 'sortDir' | 'detail' | 'grouped'>

// The user's view prefs, which nav links carry over: from the URL while the (already hydrated) list is
// open, otherwise from the persisted list state.
export function navPrefs(pathname: string, params: URLSearchParams, persisted: Partial<ListState> | null): ViewPrefs {
  const source = pathname === '/recipes' ? fromSearchParams(params) : { ...DEFAULT_STATE, ...persisted }
  const { sortKey, sortDir, detail, grouped } = source
  return { sortKey, sortDir, detail, grouped }
}

// A nav link means "these categories" (or "all recipes", or "my recipes" with role), so it drops the other
// filters but keeps the view prefs. `group` is always written: a bare /recipes would make the list restore the
// last stored filters instead of showing all recipes.
export function listHref(categories: number[], prefs: ViewPrefs, role: RoleFilter = DEFAULT_STATE.role): string {
  const params = toSearchParams({ ...DEFAULT_STATE, ...prefs, categories, role })
  params.set('group', prefs.grouped ? '1' : '0')
  return `/recipes?${params.toString()}`
}

// The category on screen, if any — its page, or the list filtered to it alone. That link is the active nav entry
// then, not "Rezepte".
export function activeCategoryId(pathname: string, params: URLSearchParams): number | null {
  const page = CATEGORY_PAGE.exec(pathname)
  if (page) return parseCategoryId(page[1])
  if (pathname !== '/recipes') return null
  const { categories } = fromSearchParams(params)
  return categories.length === 1 ? categories[0] : null
}

const CATEGORY_PAGE = /^\/categories\/([^/]+)\/?$/

export function isCategoryPage(pathname: string): boolean {
  return CATEGORY_PAGE.test(pathname)
}

// A category page belongs to "Rezepte" like a recipe does.
export function inRecipesSection(pathname: string): boolean {
  return pathname === '/recipes' || pathname.startsWith('/recipes/') || isCategoryPage(pathname)
}

// A route id as a category id; anything but a plain positive integer is no category.
export function parseCategoryId(param: string | undefined): number | null {
  return param !== undefined && /^\d+$/.test(param) ? Number(param) : null
}

export function categoryPageHref(id: number): string {
  return `/categories/${id}`
}

export function routeTitle(pathname: string): string {
  if (pathname === '/') return 'Start'
  if (pathname === '/recipes') return 'Rezepte'
  if (pathname === '/recipes/new') return 'Neues Rezept'
  if (/^\/recipes\/[^/]+\/edit$/.test(pathname)) return 'Rezept bearbeiten'
  if (pathname === '/categories') return 'Kategorien'
  return ''
}

// Router state on sidebar/tab-bar links, so the list can tell a fresh "open this list" from its own
// filter changes (which keep the scroll position).
export const SHELL_NAV_STATE = { shellNav: true } as const

export function isShellNavState(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { shellNav?: unknown }).shellNav === true
}

// aria-current for an active destination: the page itself, or a page inside its section (a recipe
// under "Rezepte").
export function currentFor(pathname: string, path: string): 'page' | 'location' {
  return pathname === path ? 'page' : 'location'
}
