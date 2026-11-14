// Subpages (recipe, category, editor) and where their header's back arrow and breadcrumb lead. The breadcrumb's
// first part is the page the user came from (mockup: "Start / Spaghetti …"); this file holds the pure rules, the
// tracking per history entry lives in useOrigin.
import { isCategoryPage } from './nav'

export type Origin = { label: string; href: string }

const RECIPE_DETAIL = /^\/recipes\/(?!new$)[^/]+$/
const RECIPE_EDIT = /^\/recipes\/([^/]+)\/edit$/

export type Subpage = 'detail' | 'category' | 'editor'

export function subpageOf(pathname: string): Subpage | null {
  if (RECIPE_DETAIL.test(pathname)) return 'detail'
  if (isCategoryPage(pathname)) return 'category'
  if (pathname === '/recipes/new' || RECIPE_EDIT.test(pathname)) return 'editor'
  return null
}

// Where the back arrow leads without in-app history (direct link, reload): the logical parent.
export function parentHref(pathname: string): string {
  const edit = RECIPE_EDIT.exec(pathname)
  if (edit) return `/recipes/${edit[1]}`
  return '/recipes'
}

// The label a page gets as an origin when it shows no crumb name of its own.
export function staticOriginLabel(pathname: string): string | null {
  if (pathname === '/') return 'Start'
  if (pathname === '/recipes') return 'Rezepte'
  if (pathname === '/categories') return 'Kategorien'
  return null
}
