// Frame for the routes App.tsx loads with React.lazy: a page-shaped skeleton while the chunk loads, and a neutral error
// card when it fails (e.g. after a deploy, the old hashes are gone). Retry reloads the whole page: React.lazy keeps a
// rejected import, so rendering again would only fail again. The boundary sits per route element, so the shell
// around it stays, and it also catches render errors of the page itself, hence the neutral wording.
import { Component, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@postxl/ui-components'
import { reloadPage } from '../lib/reloadPage'
import { ErrorState } from './StateCard'
import { Page } from './shell/Page'

type Exit = { to: string; label: string }

type BoundaryProps = { resetKey: string; exit?: Exit; bare: boolean; children: ReactNode }

class RouteErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  // React Router keeps this instance when a sibling route renders the same element type (/categories → /categories/5),
  // so leaving the failed page has to clear the error here.
  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    const { exit, bare } = this.props
    const card = (
      <Page className="pb-10">
        <h1 className="sr-only">Fehler</h1>
        <ErrorState
          title="Seite konnte nicht geladen werden"
          description="Lade die Seite neu, um es noch einmal zu versuchen."
          onRetry={reloadPage}
          extraAction={
            exit && (
              <Button asChild variant="outline" size="sm">
                <Link to={exit.to}>{exit.label}</Link>
              </Button>
            )
          }
        />
      </Page>
    )
    // Outside the shell (cook mode, sign-in) nothing else provides the page's landmark and background.
    return bare ? <main className="min-h-dvh bg-background text-foreground">{card}</main> : card
  }
}

// The status sits next to the skeleton, not around it: the auth skeleton brings its own <main>, and a live region
// should only announce the one sentence.
function RouteFallback({ children }: { children: ReactNode }) {
  return (
    <>
      <span role="status" className="sr-only">
        Seite wird geladen
      </span>
      <div aria-hidden data-testid="route-fallback">
        {children}
      </div>
    </>
  )
}

export function LazyRoute({
  fallback,
  exit,
  bare = false,
  children,
}: {
  fallback: ReactNode
  // A way out next to the retry. None on the sign-in pages: for a signed-out user "/" leads straight back there.
  exit?: Exit
  bare?: boolean
  children: ReactNode
}) {
  const { pathname } = useLocation()
  return (
    <RouteErrorBoundary resetKey={pathname} exit={exit} bare={bare}>
      <Suspense fallback={<RouteFallback>{fallback}</RouteFallback>}>{children}</Suspense>
    </RouteErrorBoundary>
  )
}
