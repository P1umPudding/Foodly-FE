import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { TimerProvider } from '../../timers/TimerProvider'
import { setViewport } from '../../test/viewport'

const CATEGORIES = [
  {
    id: 2,
    user: 1,
    name: 'Favoriten',
    recipes: [1, 2, 3],
    order: 1,
    color: '#e11d48',
    colorLight: null,
    colorDark: null,
  },
  { id: 5, user: 1, name: 'Schnell', recipes: [4], order: 2, color: '#0ea5e9', colorLight: null, colorDark: null },
]
// Swapped per test for the loading / error / empty states.
const catalog = vi.hoisted(() => ({ categories: { status: 'ready', list: [] as unknown[] } }))

vi.mock('../../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useMe: () => ({ id: 1, name: 'Kolja', profilePicture: null }),
  useCategories: () => catalog.categories,
}))

// A page with its own state: if the shell remounted the routed page, the count would reset.
function Counter() {
  const [n, setN] = useState(0)
  return (
    <button type="button" onClick={() => setN(n + 1)}>
      count {n}
    </button>
  )
}

function renderAt(entry: string) {
  return render(
    <ThemeProvider>
      <TooltipProvider>
        <TimerProvider>
          <MemoryRouter initialEntries={[entry]}>
            <AppShell>
              <Routes>
                <Route path="/recipes" element={<Counter />} />
                <Route path="/recipes/new" element={<p>editor page</p>} />
                <Route path="/recipes/:id" element={<p>detail page</p>} />
              </Routes>
            </AppShell>
          </MemoryRouter>
        </TimerProvider>
      </TooltipProvider>
    </ThemeProvider>,
  )
}

const sidebar = () => screen.getByRole('complementary', { name: 'Seitenleiste' })
const mainNav = () => screen.getByRole('navigation', { name: 'Hauptnavigation' })

beforeEach(() => {
  localStorage.clear()
  catalog.categories = { status: 'ready', list: CATEGORIES }
})
afterEach(() => setViewport(1024))

describe('AppShell on the desktop', () => {
  it('shows the sidebar with the destinations, "Neues Rezept" and the categories', () => {
    renderAt('/recipes')
    const side = within(sidebar())
    expect(side.getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('page')
    expect(side.getByRole('link', { name: 'Neues Rezept' }).getAttribute('href')).toBe('/recipes/new')
    expect(side.queryByRole('link', { name: 'Start' })).toBeNull()
    expect(side.getByRole('link', { name: /Favoriten/ }).getAttribute('href')).toBe('/recipes?cat=2&group=1')
    side.getByText('3')
    // phone-only pieces are absent
    expect(screen.getAllByRole('navigation', { name: 'Hauptnavigation' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Profil & Einstellungen' })).toBeNull()
  })

  it('collapses to icons, remembers it, and expands again', () => {
    const { unmount } = renderAt('/recipes')
    fireEvent.click(screen.getByRole('button', { name: 'Seitenleiste einklappen' }))
    expect(within(sidebar()).queryByText('Favoriten')).toBeNull()
    expect(within(sidebar()).getByRole('link', { name: 'Favoriten (3)' })).toBeTruthy()
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' })).toBeTruthy()
    expect(localStorage.getItem('foodly:sidebar-collapsed')).toBe('1')

    unmount()
    renderAt('/recipes')
    expect(within(sidebar()).queryByText('Favoriten')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Seitenleiste ausklappen' }))
    within(sidebar()).getByText('Favoriten')
    expect(localStorage.getItem('foodly:sidebar-collapsed')).toBe('0')
  })

  it('highlights the single shown category instead of "Rezepte"', () => {
    renderAt('/recipes?cat=2')
    const side = within(sidebar())
    expect(side.getByRole('link', { name: /Favoriten/ }).getAttribute('aria-current')).toBe('page')
    expect(side.getByRole('link', { name: /Schnell/ }).getAttribute('aria-current')).not.toBe('page')
    expect(side.getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).not.toBe('page')
  })

  it('keeps the view prefs in nav links but drops the filters', () => {
    renderAt('/recipes?sort=rating&view=compact&cat=2&tag=x')
    const side = within(sidebar())
    expect(side.getByRole('link', { name: 'Rezepte' }).getAttribute('href')).toBe(
      '/recipes?sort=rating&view=compact&group=1',
    )
    expect(side.getByRole('link', { name: /Schnell/ }).getAttribute('href')).toBe(
      '/recipes?cat=5&sort=rating&view=compact&group=1',
    )
  })

  it('keeps "Rezepte" current for a category that is not listed', () => {
    renderAt('/recipes?cat=999')
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('page')
  })

  it('shows skeleton rows while the categories load', () => {
    catalog.categories = { status: 'loading', list: [] }
    renderAt('/recipes?cat=2')
    const section = screen.getByRole('navigation', { name: 'Kategorien' })
    expect(section.querySelectorAll('a')).toHaveLength(0)
    expect(section.querySelectorAll('.animate-pulse')).toHaveLength(3)
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('page')
  })

  it('hides the categories section when they failed or are empty', () => {
    catalog.categories = { status: 'error', list: [] }
    const { unmount } = renderAt('/recipes')
    expect(screen.queryByRole('navigation', { name: 'Kategorien' })).toBeNull()
    unmount()
    catalog.categories = { status: 'ready', list: [] }
    renderAt('/recipes')
    expect(screen.queryByRole('navigation', { name: 'Kategorien' })).toBeNull()
  })

  it('opens the editor from "Neues Rezept"', () => {
    renderAt('/recipes')
    fireEvent.click(within(sidebar()).getByRole('link', { name: 'Neues Rezept' }))
    screen.getByText('editor page')
  })

  it('opens the profile menu with the name and the theme choice', async () => {
    renderAt('/recipes')
    fireEvent.keyDown(within(sidebar()).getByRole('button', { name: 'Kolja – Profil & Einstellungen' }), {
      key: 'Enter',
    })
    const menu = await screen.findByRole('menu')
    within(menu).getByText('Kolja')
    within(menu).getByRole('menuitem', { name: /Theme/ })
  })
})

describe('AppShell on the phone', () => {
  beforeEach(() => setViewport(375))

  it('shows tab bar, "+" button and avatar on the list; "+" opens the editor', () => {
    renderAt('/recipes')
    expect(screen.queryByRole('complementary', { name: 'Seitenleiste' })).toBeNull()
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('page')
    screen.getByRole('button', { name: 'Profil & Einstellungen' })
    fireEvent.click(screen.getByRole('link', { name: 'Neues Rezept' }))
    screen.getByText('editor page')
  })

  it('keeps "Rezepte" current on a category view (no category tabs)', () => {
    renderAt('/recipes?cat=2')
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('page')
  })

  it('has no "+" button and no avatar on sub-pages', () => {
    renderAt('/recipes/5')
    screen.getByText('detail page')
    mainNav()
    expect(screen.queryByRole('link', { name: 'Neues Rezept' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Profil & Einstellungen' })).toBeNull()
  })

  it('opens the profile menu from the avatar', async () => {
    renderAt('/recipes')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Profil & Einstellungen' }), { key: 'Enter' })
    within(await screen.findByRole('menu')).getByText('Kolja')
  })
})

it('keeps the page mounted when crossing the breakpoint', () => {
  renderAt('/recipes')
  fireEvent.click(screen.getByRole('button', { name: 'count 0' }))
  setViewport(375)
  screen.getByRole('button', { name: 'count 1' })
  expect(screen.queryByRole('complementary', { name: 'Seitenleiste' })).toBeNull()
  mainNav()
  setViewport(1024)
  screen.getByRole('button', { name: 'count 1' })
  sidebar()
})
