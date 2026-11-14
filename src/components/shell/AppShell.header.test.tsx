// The header on subpages (#228): back arrow, "<origin> / <name>" and the page's actions.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { HeaderActions, HeaderCrumbName } from './PageHeader'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { TimerProvider } from '../../timers/TimerProvider'
import { setViewport } from '../../test/viewport'

vi.mock('../../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useMe: () => ({ id: 1, name: 'Kolja', profilePicture: null }),
  useCategories: () => ({
    status: 'ready',
    list: [
      {
        id: 2,
        user: 1,
        name: 'Favoriten',
        recipes: [1],
        order: 1,
        color: '#e11d48',
        colorLight: null,
        colorDark: null,
      },
    ],
  }),
}))

const NAMES: Record<string, string> = { '1': 'Spaghetti Bolognese', '3': 'Linsensuppe' }

function DetailProbe() {
  const { id = '' } = useParams()
  return (
    <>
      <HeaderCrumbName name={NAMES[id]} />
      <HeaderActions>
        <button type="button">probe action</button>
      </HeaderActions>
      <p>detail {id}</p>
      <Link to="/categories/2">open category</Link>
      <Link to="/recipes/3">open other</Link>
      <ReplaceButton />
    </>
  )
}

// Like the size stepper: a replace on the same page.
function ReplaceButton() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate('?factor=2', { replace: true })}>
      replace entry
    </button>
  )
}

type Entry = string | { pathname: string; key: string }

function renderAt(entries: Entry[]) {
  return render(
    <ThemeProvider>
      <TooltipProvider>
        <TimerProvider userId={1}>
          <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
            <AppShell>
              <Routes>
                <Route path="/" element={<Link to="/recipes/1">open recipe</Link>} />
                <Route path="/recipes" element={<p>list page</p>} />
                <Route path="/recipes/new" element={<p>editor page</p>} />
                <Route path="/recipes/:id" element={<DetailProbe />} />
                <Route path="/recipes/:id/edit" element={<p>editor page</p>} />
                <Route path="/categories/:id" element={<p>category page</p>} />
              </Routes>
            </AppShell>
          </MemoryRouter>
        </TimerProvider>
      </TooltipProvider>
    </ThemeProvider>,
  )
}

const header = () => within(screen.getByRole('banner'))
const crumbText = () => screen.getByRole('navigation', { name: 'Pfad' }).textContent

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => setViewport(1024))

describe('AppShell header on subpages', () => {
  it('opened directly: back to the list and "Rezepte / <name>"', () => {
    renderAt(['/recipes/1'])
    expect(header().getByRole('link', { name: 'Zurück' }).getAttribute('href')).toBe('/recipes')
    expect(crumbText()).toBe('Rezepte/Spaghetti Bolognese')
    expect(header().getByRole('link', { name: 'Rezepte' }).getAttribute('href')).toBe('/recipes?group=1')
    expect(header().getByText('Spaghetti Bolognese').getAttribute('aria-current')).toBe('page')
  })

  it('coming from Start: "Start / <name>", and back returns there', () => {
    renderAt(['/'])
    fireEvent.click(screen.getByRole('link', { name: 'open recipe' }))
    expect(crumbText()).toBe('Start/Spaghetti Bolognese')
    expect(header().getByRole('link', { name: 'Start' }).getAttribute('href')).toBe('/')
    fireEvent.click(header().getByRole('link', { name: 'Zurück' }))
    screen.getByRole('link', { name: 'open recipe' })
  })

  it('names a recipe as the origin of the next page', () => {
    renderAt(['/recipes/1'])
    fireEvent.click(screen.getByRole('link', { name: 'open category' }))
    expect(crumbText()).toBe('Spaghetti Bolognese/Favoriten')
    fireEvent.click(header().getByRole('link', { name: 'Zurück' }))
    fireEvent.click(screen.getByRole('link', { name: 'open other' }))
    expect(crumbText()).toBe('Spaghetti Bolognese/Linsensuppe')
  })

  it('keeps the origin when going back to an entry', () => {
    renderAt(['/'])
    fireEvent.click(screen.getByRole('link', { name: 'open recipe' }))
    fireEvent.click(screen.getByRole('link', { name: 'open category' }))
    fireEvent.click(header().getByRole('link', { name: 'Zurück' }))
    expect(crumbText()).toBe('Start/Spaghetti Bolognese')
  })

  it('keeps the origin when the entry is replaced (size change)', () => {
    renderAt(['/'])
    fireEvent.click(screen.getByRole('link', { name: 'open recipe' }))
    fireEvent.click(screen.getByRole('button', { name: 'replace entry' }))
    expect(crumbText()).toBe('Start/Spaghetti Bolognese')
  })

  it('remembers the origin across a reload (same history key)', () => {
    sessionStorage.setItem('foodly.origin', JSON.stringify({ k1: { label: 'Favoriten', href: '/categories/2' } }))
    renderAt([{ pathname: '/recipes/1', key: 'k1' }])
    expect(crumbText()).toBe('Favoriten/Spaghetti Bolognese')
    expect(header().getByRole('link', { name: 'Favoriten' }).getAttribute('href')).toBe('/categories/2')
  })

  it('keeps at most 50 stored origins, dropping the oldest', () => {
    const stored = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, null]))
    sessionStorage.setItem('foodly.origin', JSON.stringify(stored))
    renderAt(['/'])
    fireEvent.click(screen.getByRole('link', { name: 'open recipe' }))
    const keys = Object.keys(JSON.parse(sessionStorage.getItem('foodly.origin')!) as object)
    expect(keys).toHaveLength(50)
    expect(keys[0]).toBe('k1')
    expect(keys[keys.length - 1]).not.toMatch(/^k\d+$/)
  })

  it('puts the page actions into the header', () => {
    renderAt(['/recipes/1'])
    header().getByRole('button', { name: 'probe action' })
    expect(within(screen.getByRole('main')).queryByRole('button', { name: 'probe action' })).toBeNull()
  })

  it('shows only the origin while the name is unknown', () => {
    renderAt(['/categories/999'])
    expect(crumbText()).toBe('Rezepte')
  })

  it('titles the editor without a crumb, back leads to the recipe', () => {
    renderAt(['/recipes/1/edit'])
    header().getByText('Rezept bearbeiten')
    expect(screen.queryByRole('navigation', { name: 'Pfad' })).toBeNull()
    expect(header().getByRole('link', { name: 'Zurück' }).getAttribute('href')).toBe('/recipes/1')
  })

  it('shows "Neues Rezept" for a new recipe', () => {
    renderAt(['/recipes/new'])
    header().getByText('Neues Rezept')
  })

  it('has no back arrow on main pages', () => {
    renderAt(['/recipes'])
    expect(header().queryByRole('link', { name: 'Zurück' })).toBeNull()
  })

  it('shows only the arrow and the actions on the phone', () => {
    setViewport(390)
    renderAt(['/recipes/1'])
    header().getByRole('link', { name: 'Zurück' })
    header().getByRole('button', { name: 'probe action' })
    expect(screen.queryByRole('navigation', { name: 'Pfad' })).toBeNull()
  })
})
