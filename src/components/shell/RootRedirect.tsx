import { Navigate, useLocation } from 'react-router-dom'

// `/` belongs to the dashboard, which isn't built yet. Until then it forwards to the list and keeps the
// query string, so old bookmarks and shared links like `/?cat=3` keep working.
export function RootRedirect() {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: '/recipes', search, hash }} replace />
}
