// Route guards. Signed-out users never reach the shell or the catalogs (no /users/me, /tags, … without a
// session); /login and /register sit outside both. In mock mode foodly.auth is always signed in, so
// nothing is guarded and /login forwards to the list. Signed-in routes pick their frame below the guard:
// ShellLayout (sidebar / tab bar) or BareLayout (cook mode), both under the same timers, catalogs and toasts.
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { foodly } from '../../api'
import { CatalogProvider } from '../../catalog/CatalogProvider'
import { useAuthSession } from '../../hooks/useAuthSession'
import { safeNext } from '../../lib/safeNext'
import { TimerProvider } from '../../timers/TimerProvider'
import type { LoginState } from '../auth/loginState'
import { AppShell } from './AppShell'
import { AppToaster } from './AppToaster'

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
  // Keyed on the user, so a sign-in as someone else (e.g. in another tab) reloads `me` and the catalogs and
  // swaps in that user's timers; the previous user's alarm ends with their provider. One Toaster for both
  // frames: sonner starts empty on mount, so a running alarm toast would vanish on the way into cook mode.
  return (
    <TimerProvider key={session.userId} userId={session.userId}>
      <CatalogProvider key={session.userId}>
        <Outlet />
        <AppToaster />
      </CatalogProvider>
    </TimerProvider>
  )
}

// Here rather than in AppShell.tsx, so tests that mock the AppShell module keep a working layout route.
export function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
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
