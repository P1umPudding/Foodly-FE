// Route guards. Signed-out users never reach the shell or the catalogs (no /users/me, /tags, … without a
// session); /login and /register sit outside both. In mock mode foodly.auth is always signed in, so
// nothing is guarded and /login forwards to the list.
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { foodly } from '../../api'
import type { LoginState } from '../auth/loginState'
import { CatalogProvider } from '../../catalog/CatalogProvider'
import { useAuthSession } from '../../hooks/useAuthSession'
import { safeNext } from '../../lib/safeNext'
import { AppShell } from './AppShell'

export function RequireAuth() {
  const session = useAuthSession()
  const { pathname, search, hash } = useLocation()
  if (!session) {
    const end = foodly.auth.sessionEnd()
    // Signed out in this tab on purpose: the next person shouldn't land on this page after signing in.
    // (A sign-out in another tab still keeps next: its reason isn't shared between tabs.)
    if (end?.reason === 'signed-out') return <Navigate to="/login" replace />
    const next = new URLSearchParams({ next: pathname + search + hash })
    const state: LoginState | undefined = end?.reason === 'expired' ? { expired: true, email: end.email } : undefined
    return <Navigate to={`/login?${next.toString()}`} replace state={state} />
  }
  // Keyed on the user, so a sign-in as someone else (e.g. in another tab) reloads `me` and the catalogs.
  return (
    <CatalogProvider key={session.userId}>
      <AppShell>
        <Outlet />
      </AppShell>
    </CatalogProvider>
  )
}

// Also the redirect after a successful sign-in: signIn/signUp store the session before they resolve,
// so this is the one place that leaves the page, to the same target either way.
export function RedirectIfSignedIn() {
  const session = useAuthSession()
  const [params] = useSearchParams()
  if (session) return <Navigate to={safeNext(params.get('next'))} replace />
  return <Outlet />
}
