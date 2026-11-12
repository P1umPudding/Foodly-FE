import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Home } from './Home'

const me = vi.hoisted(() => ({ current: { id: 1, name: 'Kolja Beispiel', profilePicture: null } as unknown }))
vi.mock('../catalog/CatalogProvider', () => ({ useMe: () => me.current }))

function renderHome() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // Only Date: faking the timers too would stall Testing Library's polling.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 12, 12))
})
afterEach(() => {
  vi.useRealTimers()
  me.current = { id: 1, name: 'Kolja Beispiel', profilePicture: null }
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
})
