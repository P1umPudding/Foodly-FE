import { Navigate, useLocation } from 'react-router-dom'
import { hasListParams } from '../list/url'
import { Home } from './Home'

// `/` is the start page. Before it existed `/` was the list, so old bookmarks and shared links like
// `/?cat=3` still open the list with their filters.
export function RootRoute() {
  const { search, hash } = useLocation()
  if (hasListParams(new URLSearchParams(search))) {
    return <Navigate to={{ pathname: '/recipes', search, hash }} replace />
  }
  return <Home />
}
