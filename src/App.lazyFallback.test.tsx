import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedSession } from './test/auth'
import App from './App'

// The lazy pages' chunks never arrive here, so each route stays on the fallback App gives it (AC4 of #221).
// vi.mock is hoisted, hence the inline factories.
vi.mock('./pages/Login', () => new Promise(() => {}))
vi.mock('./pages/Register', () => new Promise(() => {}))
vi.mock('./pages/RecipeEditor', () => new Promise(() => {}))
vi.mock('./pages/Categories', () => new Promise(() => {}))
vi.mock('./pages/CategoryPage', () => new Promise(() => {}))
vi.mock('./pages/CookMode', () => new Promise(() => {}))
vi.mock('./pages/Profile', () => new Promise(() => {}))

vi.mock('./components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <nav aria-label="Shell">{children}</nav>,
}))
vi.mock('./catalog/CatalogProvider', () => ({
  CatalogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const at = (path: string) =>
  render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

afterEach(() => localStorage.clear())

describe('lazy route fallbacks', () => {
  it.each([
    ['/recipes/new', 'Neues Rezept', true],
    ['/recipes/5/edit', 'Rezept bearbeiten', true],
    ['/categories', 'Kategorien', true],
    ['/categories/2', 'Kategorie', true],
    ['/profile', 'Profil & Einstellungen', true],
    ['/recipes/5/cook', 'Kochen', false],
  ])('%s shows a page-shaped skeleton, no spinner', (path, title, inShell) => {
    seedSession()
    const { container } = at(path)
    expect(screen.getByRole('status').textContent).toBe('Seite wird geladen')
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeTruthy()
    expect(screen.getByTestId('route-fallback').querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(container.querySelector('.animate-spin')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Shell' }) !== null).toBe(inShell)
    // The real shell brings <main> (mocked away here); cook mode's fallback has to bring its own.
    if (!inShell) {
      expect(screen.getByRole('heading', { level: 1, name: title }).closest('main')).not.toBeNull()
      expect(screen.getAllByRole('main')).toHaveLength(1)
    }
  })

  it.each([
    ['/login', 'Anmelden'],
    ['/register', 'Konto anlegen'],
  ])('%s shows the sign-in card skeleton inside a main landmark', (path, title) => {
    const { container } = at(path)
    const heading = screen.getByRole('heading', { level: 1, name: title })
    expect(heading.closest('main')).not.toBeNull()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByTestId('route-fallback').querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
