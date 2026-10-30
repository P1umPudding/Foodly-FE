import { useLocation, useSearchParams } from 'react-router-dom'
import { useCurrentUserId } from '../../catalog/CatalogProvider'
import { loadPersisted } from '../../list/persistence'
import { activeCategoryId, listHref, navPrefs } from './nav'

// What sidebar and tab bar need to address the list: its hrefs (with the user's view prefs) and which
// single category, if any, the list currently shows.
export function useNavState() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const currentUserId = useCurrentUserId()
  const prefs = navPrefs(pathname, params, pathname === '/recipes' ? null : loadPersisted(currentUserId))
  return {
    pathname,
    activeCategory: activeCategoryId(pathname, params),
    hrefFor: (path: string) => (path === '/recipes' ? listHref([], prefs) : path),
    categoryHref: (id: number) => listHref([id], prefs),
  }
}
