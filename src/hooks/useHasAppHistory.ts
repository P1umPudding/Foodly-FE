import { useLocation } from 'react-router-dom'

// Whether an in-app entry lies behind the current one, so `navigate(-1)` stays inside the app. The sign-in
// redirect replaces the entry (non-default key) without adding one before it, so BrowserRouter's history index
// (0 = first entry) decides too. MemoryRouter keeps no index there; then only the key counts.
// Returns a function: `window.history.state` is not reactive, so read it at click time.
export function useHasAppHistory(): () => boolean {
  const { key } = useLocation()
  return () => {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx
    return key !== 'default' && (typeof idx !== 'number' || idx > 0)
  }
}
