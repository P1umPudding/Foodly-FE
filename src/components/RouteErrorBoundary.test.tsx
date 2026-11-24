import { lazy } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reloadPage } from '../lib/reloadPage'
import { LazyRoute } from './RouteErrorBoundary'
import { Skeleton } from './Skeleton'

vi.mock('../lib/reloadPage', () => ({ reloadPage: vi.fn() }))

// What a stale chunk after a deploy looks like to React.lazy.
const Broken = lazy(() => Promise.reject(new Error('Failed to fetch dynamically imported module')))
const Working = lazy(() => Promise.resolve({ default: () => <h1>Fertig geladen</h1> }))
const Pending = lazy(() => new Promise<never>(() => {}))

function renderAt(path: string, routes: ReactNode) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Link to="/ok">Weiter</Link>
      <Link to="/broken">Andere Seite</Link>
      <Routes>{routes}</Routes>
    </MemoryRouter>,
  )
}

// React reports the caught error (console and, in dev, a window error event jsdom would print); it is the expected
// outcome here.
const silence = (e: ErrorEvent) => e.preventDefault()
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  window.addEventListener('error', silence)
})
afterEach(() => {
  window.removeEventListener('error', silence)
  vi.restoreAllMocks()
})

describe('LazyRoute', () => {
  it('shows the skeleton fallback while the chunk loads, no spinner', () => {
    const { container } = renderAt(
      '/',
      <Route
        path="/"
        element={
          <LazyRoute title="Testseite" fallback={<Skeleton className="h-4" />}>
            <Pending />
          </LazyRoute>
        }
      />,
    )
    expect(screen.getByRole('status').textContent).toBe('Seite wird geladen')
    expect(screen.getByRole('heading', { level: 1, name: 'Testseite' })).toBeTruthy()
    expect(screen.getByTestId('route-fallback').querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(container.querySelector('.animate-spin')).toBeNull()
  })

  it('shows the retry card when the chunk fails, and retry reloads the page', async () => {
    renderAt(
      '/',
      <Route
        path="/"
        element={
          <LazyRoute title="Testseite" fallback={null} exit={{ to: '/', label: 'Zur Startseite' }}>
            <Broken />
          </LazyRoute>
        }
      />,
    )
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Seite konnte nicht geladen werden')
    expect(screen.getByRole('link', { name: 'Zur Startseite' }).getAttribute('href')).toBe('/')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(reloadPage).toHaveBeenCalledTimes(1)
  })

  it('offers no way out without an exit, and brings its own main outside the shell', async () => {
    renderAt(
      '/',
      <Route
        path="/"
        element={
          <LazyRoute title="Testseite" fallback={null} bare>
            <Broken />
          </LazyRoute>
        }
      />,
    )
    const alert = await screen.findByRole('alert')
    expect(alert.closest('main')).not.toBeNull()
    expect(screen.queryByRole('link', { name: /Zur/ })).toBeNull()
  })

  it('outside the shell, keeps one visible main while a sibling route loads over a loaded page', async () => {
    const Page = lazy(() => Promise.resolve({ default: () => <main>Geladene Seite</main> }))
    renderAt(
      '/ok',
      <>
        <Route
          path="/ok"
          element={
            <LazyRoute title="Erste Seite" fallback={null} bare>
              <Page />
            </LazyRoute>
          }
        />
        <Route
          path="/broken"
          element={
            <LazyRoute title="Zweite Seite" fallback={<Skeleton className="h-4" />} bare>
              <Pending />
            </LazyRoute>
          }
        />
      </>,
    )
    await screen.findByText('Geladene Seite')
    fireEvent.click(screen.getByRole('link', { name: 'Andere Seite' }))
    // React hides the loaded page with display: none, which takes its main out of the accessibility tree.
    expect(screen.getByRole('heading', { level: 1, name: 'Zweite Seite' })).toBeTruthy()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('clears the error when a sibling lazy route takes over', async () => {
    renderAt(
      '/broken',
      <>
        <Route
          path="/broken"
          element={
            <LazyRoute title="Testseite" fallback={null}>
              <Broken />
            </LazyRoute>
          }
        />
        <Route
          path="/ok"
          element={
            <LazyRoute title="Testseite" fallback={null}>
              <Working />
            </LazyRoute>
          }
        />
      </>,
    )
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('link', { name: 'Weiter' }))
    await screen.findByRole('heading', { name: 'Fertig geladen' })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
