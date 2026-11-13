import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Home } from './Home'
import type { UserCategory } from '../api/protocol'

const me = vi.hoisted(() => ({ current: { id: 1, name: 'Kolja Beispiel', profilePicture: null } as unknown }))
const categories = vi.hoisted(() => ({
  current: { list: [] as UserCategory[], status: 'ready', error: null as Error | null, retry: () => {} },
}))
vi.mock('../catalog/CatalogProvider', () => ({
  useMe: () => me.current,
  useCurrentUserId: () => 1,
  useCategories: () => categories.current,
}))

function renderHome() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  // Only Date: faking the timers too would stall Testing Library's polling.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 12, 12))
})
afterEach(() => {
  vi.useRealTimers()
  me.current = { id: 1, name: 'Kolja Beispiel', profilePicture: null }
  categories.current = { list: [], status: 'ready', error: null, retry: () => {} }
})

describe('Home', () => {
  it('greets with the first name and today', () => {
    renderHome()
    screen.getByText('Donnerstag, 12. November')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hallo Kolja')
  })

  it('says just "Hallo" without a user', () => {
    me.current = null
    renderHome()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hallo')
  })

  it('shows the "nothing to show" card while no section has content', () => {
    renderHome()
    const card = screen.getByText(
      'Hier erscheinen deine Kategorien und Rezepte, die du zuletzt erstellt oder angesehen hast.',
    ).parentElement!
    expect(within(card).getByRole('link', { name: 'Alle Rezepte' }).getAttribute('href')).toBe('/recipes')
    expect(within(card).getByRole('link', { name: 'Neues Rezept' }).getAttribute('href')).toBe('/recipes/new')
  })

  it('shows the categories section instead of the card once there are categories', () => {
    categories.current.list = [
      {
        id: 4,
        user: 1,
        name: 'Favoriten',
        recipes: [1, 2],
        order: 0,
        color: '#3b82f6',
        colorLight: null,
        colorDark: null,
      },
    ]
    renderHome()
    screen.getByRole('heading', { level: 2, name: 'Kategorien' })
    expect(screen.getByRole('link', { name: 'Favoriten, 2 Rezepte' }).getAttribute('href')).toBe('/categories/4')
    expect(screen.queryByRole('link', { name: 'Alle Rezepte' })).toBeNull()
  })
})
