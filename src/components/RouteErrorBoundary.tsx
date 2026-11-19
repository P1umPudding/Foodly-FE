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

type BoundaryState = { failed: boolean; resetKey: string }

class RouteErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  // React Router keeps this instance when a sibling route renders the same element type (/login → /register,
  // /recipes/new → /recipes/5/edit), so leaving the failed page clears the error, before the new path renders.
  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState) {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey }
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

// The page's own h1 arrives with its chunk; until then `title` keeps one heading for screen readers. The status sits
// next to the aria-hidden skeleton, so the live region announces only its one sentence. Outside the shell nothing
// else provides the main landmark, so `bare` brings one: a plain block, since `display: contents` drops the landmark
// role in older Safari / iOS.
function RouteFallback({ title, bare, children }: { title: string; bare: boolean; children: ReactNode }) {
  const content = (
    <>
      <h1 className="sr-only">{title}</h1>
      <span role="status" className="sr-only">
        Seite wird geladen
      </span>
      <div aria-hidden data-testid="route-fallback">
        {children}
      </div>
    </>
  )
  return bare ? <main className="min-h-dvh">{content}</main> : content
}

export function LazyRoute({
  title,
  fallback,
  exit,
  bare = false,
  children,
}: {
  title: string
  fallback: ReactNode
  // A way out next to the retry. None on the sign-in pages: for a signed-out user "/" leads straight back there.
  exit?: Exit
  bare?: boolean
  children: ReactNode
}) {
  const { pathname } = useLocation()
  return (
    <RouteErrorBoundary resetKey={pathname} exit={exit} bare={bare}>
      <Suspense
        fallback={
          <RouteFallback title={title} bare={bare}>
            {fallback}
          </RouteFallback>
        }
      >
        {children}
      </Suspense>
    </RouteErrorBoundary>
  )
}
