// Subpages (recipe, category, editor, settings such as /categories) and where their header's back arrow and
// breadcrumb lead. The breadcrumb's first part is the page the user came from (mockup: "Start / Spaghetti …"); this
// file holds the pure rules, the tracking per history entry lives in useOrigin.
import { isCategoryPage } from './nav'

export type Origin = { label: string; href: string }

const RECIPE_DETAIL = /^\/recipes\/(?!new$)[^/]+$/
const RECIPE_EDIT = /^\/recipes\/([^/]+)\/edit$/
const COOK_MODE = /^\/recipes\/[^/]+\/cook$/

// Cook mode runs without the shell, so it is no subpage; the Toaster still needs to know it.
export function isCookMode(pathname: string): boolean {
  return COOK_MODE.test(pathname)
}

export type Subpage = 'detail' | 'category' | 'editor' | 'settings'

export function subpageOf(pathname: string): Subpage | null {
  if (RECIPE_DETAIL.test(pathname)) return 'detail'
  if (isCategoryPage(pathname)) return 'category'
  if (pathname === '/recipes/new' || RECIPE_EDIT.test(pathname)) return 'editor'
  if (pathname === '/categories') return 'settings'
  return null
}

// Where the back arrow leads without in-app history (direct link, reload): the logical parent.
export function parentHref(pathname: string): string {
  const edit = RECIPE_EDIT.exec(pathname)
  if (edit) return `/recipes/${edit[1]}`
  // Categories are a setting: the mockup leads back to the profile page.
  if (pathname === '/categories') return '/profile'
  return '/recipes'
}

// The label a page gets as an origin when it shows no crumb name of its own.
export function staticOriginLabel(pathname: string): string | null {
  if (pathname === '/') return 'Start'
  if (pathname === '/recipes') return 'Rezepte'
  if (pathname === '/categories') return 'Kategorien'
  if (pathname === '/profile') return 'Profil'
  return null
}
