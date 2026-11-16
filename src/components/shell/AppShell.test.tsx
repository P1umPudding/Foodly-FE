import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
        <TimerProvider userId={1}>
          <MemoryRouter initialEntries={[entry]}>
            <AppShell>
              <Routes>
                <Route path="/" element={<p>start page</p>} />
                <Route path="/recipes" element={<Counter />} />
                <Route path="/recipes/new" element={<p>editor page</p>} />
                <Route path="/recipes/:id" element={<p>detail page</p>} />
                <Route path="/categories" element={<p>categories page</p>} />
                <Route path="/categories/:id" element={<p>category page</p>} />
                <Route path="/profile" element={<p>profile page</p>} />
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
  it('keeps the 60 px default header height (no phone override on the shell root)', () => {
    renderAt('/recipes')
    const header = screen.getByRole('banner')
    expect(header.className).toContain('h-(--site-nav-h)')
    expect(header.closest('.min-h-screen')!.className).not.toContain('--site-nav-h')
  })

  it('shows the sidebar with the destinations, "Neues Rezept" and the categories', () => {
    renderAt('/recipes')
    const side = within(sidebar())
    expect(side.getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('page')
    expect(side.getByRole('link', { name: 'Neues Rezept' }).getAttribute('href')).toBe('/recipes/new')
    const destinations = within(mainNav())
      .getAllByRole('link')
      .map((l) => l.textContent)
    expect(destinations.indexOf('Start')).toBeLessThan(destinations.indexOf('Rezepte'))
    expect(side.getByRole('link', { name: 'Start' }).getAttribute('aria-current')).toBeNull()
    expect(side.getByRole('link', { name: /Favoriten/ }).getAttribute('href')).toBe('/categories/2')
    side.getByText('3')
    // phone-only pieces are absent
    expect(screen.getAllByRole('navigation', { name: 'Hauptnavigation' })).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Profil & Einstellungen' })).toBeNull()
  })

  it('marks Start current on / only', () => {
    renderAt('/')
    const nav = within(mainNav())
    expect(nav.getByRole('link', { name: 'Start' }).getAttribute('href')).toBe('/')
    expect(nav.getByRole('link', { name: 'Start' }).getAttribute('aria-current')).toBe('page')
    expect(nav.getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBeNull()
    within(screen.getByRole('banner')).getByText('Start')
  })

  it('is 248 px wide expanded and 64 px collapsed (#246)', () => {
    renderAt('/recipes')
    expect(sidebar().className.split(/\s+/)).toContain('w-62')
    fireEvent.click(screen.getByRole('button', { name: 'Seitenleiste einklappen' }))
    expect(sidebar().className.split(/\s+/)).toContain('w-16')
  })

  it('collapses to icons, remembers it, and expands again', () => {
    const { unmount } = renderAt('/recipes')
    within(sidebar()).getByRole('link', { name: 'Foodly' })
    fireEvent.click(screen.getByRole('button', { name: 'Seitenleiste einklappen' }))
    expect(within(sidebar()).queryByRole('link', { name: 'Foodly' })).toBeNull()
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

  it('leads to the start page from the wordmark', () => {
    renderAt('/recipes/1')
    const wordmark = within(sidebar()).getByRole('link', { name: 'Foodly' })
    expect(wordmark.getAttribute('href')).toBe('/')
    fireEvent.click(wordmark)
    screen.getByText('start page')
  })

  it('gives the wordmark the 3 px focus ring in the sidebar ring colour (#90/#95)', () => {
    renderAt('/recipes')
    const classes = within(sidebar()).getByRole('link', { name: 'Foodly' }).className.split(/\s+/)
    expect(classes).toEqual(expect.arrayContaining(['focus-visible:ring-[3px]', 'focus-visible:ring-sidebar-ring']))
    expect(classes).not.toContain('focus-visible:ring-2')
  })

  it('sets the wordmark at the mockup 17/700, not .font-display (#246)', () => {
    renderAt('/recipes')
    const classes = within(sidebar()).getByText('Foodly').className.split(/\s+/)
    expect(classes).toEqual(expect.arrayContaining(['text-[17px]', 'font-bold']))
    expect(classes).not.toContain('font-display')
  })

  it('highlights the single shown category instead of "Rezepte"', () => {
    renderAt('/recipes?cat=2')
    const side = within(sidebar())
    // Highlighted, but its link leads to the category page, which this is not.
    expect(side.getByRole('link', { name: /Favoriten/ }).getAttribute('aria-current')).toBe('location')
    expect(side.getByRole('link', { name: /Schnell/ }).getAttribute('aria-current')).toBeNull()
    expect(side.getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).not.toBe('page')
  })

  it('keeps the view prefs in the "Rezepte" link but drops the filters; category links are plain', () => {
    renderAt('/recipes?sort=rating&view=compact&cat=2&tag=x')
    const side = within(sidebar())
    expect(side.getByRole('link', { name: 'Rezepte' }).getAttribute('href')).toBe(
      '/recipes?sort=rating&view=compact&group=1',
    )
    expect(side.getByRole('link', { name: /Schnell/ }).getAttribute('href')).toBe('/categories/5')
  })

  it('highlights the category on its page and shows "Rezepte / <Name>" in the header', () => {
    renderAt('/categories/2')
    screen.getByText('category page')
    const side = within(sidebar())
    expect(side.getByRole('link', { name: /Favoriten/ }).getAttribute('aria-current')).toBe('page')
    expect(side.getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).not.toBe('page')
    const crumb = within(screen.getByRole('navigation', { name: 'Pfad' }))
    expect(crumb.getByRole('link', { name: 'Rezepte' }).getAttribute('href')).toBe('/recipes?group=1')
    expect(crumb.getByText('Favoriten').getAttribute('aria-current')).toBe('page')
  })

  it('shows only "Rezepte" in the header while the category is unknown', () => {
    renderAt('/categories/999')
    const crumb = screen.getByRole('navigation', { name: 'Pfad' })
    expect(crumb.textContent).toBe('Rezepte')
  })

  it('keeps "Rezepte" current for a category that is not listed', () => {
    renderAt('/recipes?cat=999')
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('page')
  })

  it('shows skeleton rows while the categories load', () => {
    catalog.categories = { status: 'loading', list: [] }
    renderAt('/recipes?cat=2')
    const section = screen.getByRole('navigation', { name: 'Kategorien' })
    // Only the gear: no category entries yet.
    expect(
      within(section)
        .getAllByRole('link')
        .map((a) => a.getAttribute('aria-label')),
    ).toEqual(['Kategorien verwalten'])
    expect(within(section).getAllByTestId('category-skeleton')).toHaveLength(3)
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

  it('leads to the profile page from the name at the bottom', () => {
    renderAt('/recipes')
    const row = within(sidebar()).getByRole('link', { name: 'Kolja – Profil & Einstellungen' })
    expect(row.getAttribute('href')).toBe('/profile')
    expect(row.getAttribute('aria-current')).toBeNull()
    within(row).getByText('Kolja')
    fireEvent.click(row)
    screen.getByText('profile page')
  })

  it('leads to the profile page from the avatar in the collapsed sidebar', () => {
    renderAt('/recipes')
    fireEvent.click(screen.getByRole('button', { name: 'Seitenleiste einklappen' }))
    fireEvent.click(within(sidebar()).getByRole('link', { name: 'Profil & Einstellungen' }))
    screen.getByText('profile page')
  })

  it('marks the profile entry current on /profile and on /categories, not on a category page', () => {
    const profileRow = () => within(sidebar()).getByRole('link', { name: 'Kolja – Profil & Einstellungen' })
    const { unmount } = renderAt('/profile')
    expect(profileRow().getAttribute('aria-current')).toBe('page')
    expect(within(mainNav()).getByRole('link', { name: 'Start' }).getAttribute('aria-current')).toBeNull()
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBeNull()
    unmount()
    const second = renderAt('/categories')
    expect(profileRow().getAttribute('aria-current')).toBe('location')
    second.unmount()
    renderAt('/categories/2')
    expect(profileRow().getAttribute('aria-current')).toBeNull()
  })

  it('marks the profile avatar current in the collapsed sidebar', () => {
    renderAt('/profile')
    fireEvent.click(screen.getByRole('button', { name: 'Seitenleiste einklappen' }))
    const avatar = within(sidebar()).getByRole('link', { name: 'Profil & Einstellungen' })
    expect(avatar.getAttribute('aria-current')).toBe('page')
    expect(avatar.className).toContain('bg-sidebar-accent')
  })

  it('leads to the categories page from the gear next to "Kategorien"', () => {
    renderAt('/recipes')
    const gear = within(sidebar()).getByRole('link', { name: 'Kategorien verwalten' })
    expect(gear.getAttribute('href')).toBe('/categories')
    fireEvent.click(gear)
    screen.getByText('categories page')
    expect(screen.getByRole('banner').textContent).toContain('Kategorien')
  })

  it('has no gear in the collapsed sidebar', () => {
    renderAt('/recipes')
    fireEvent.click(screen.getByRole('button', { name: 'Seitenleiste einklappen' }))
    expect(within(sidebar()).queryByRole('link', { name: 'Kategorien verwalten' })).toBeNull()
  })
})

describe('AppShell on the phone', () => {
  beforeEach(() => setViewport(375))

  it('has a 56 px header (the offset the category headers stick at)', () => {
    renderAt('/recipes')
    const header = screen.getByRole('banner')
    expect(header.className).toContain('h-(--site-nav-h)')
    expect(header.closest('.min-h-screen')!.className).toContain('[--site-nav-h:3.5rem]')
  })

  it('has a 52 px "+" with the mockup shadow', () => {
    renderAt('/recipes')
    const fab = screen.getByRole('link', { name: 'Neues Rezept' })
    expect(fab.className).toContain('size-13')
    expect(fab.className).toContain('shadow-[0_6px_20px_rgb(0_0_0/0.22)]')
    expect(fab.className).not.toContain('size-14')
    expect(fab.className).not.toContain('shadow-lg')
  })

  it('leads to the profile page from the avatar', () => {
    renderAt('/recipes')
    const avatar = screen.getByRole('link', { name: 'Profil & Einstellungen' })
    expect(avatar.getAttribute('href')).toBe('/profile')
    fireEvent.click(avatar)
    screen.getByText('profile page')
  })

  it('has no avatar and no active tab on /profile', () => {
    renderAt('/profile')
    expect(screen.queryByRole('link', { name: 'Profil & Einstellungen' })).toBeNull()
    expect(within(mainNav()).getByRole('link', { name: 'Start' }).getAttribute('aria-current')).toBeNull()
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBeNull()
  })

  it('shows tab bar, "+" button and avatar on the list; "+" opens the editor', () => {
    renderAt('/recipes')
    expect(screen.queryByRole('complementary', { name: 'Seitenleiste' })).toBeNull()
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('page')
    screen.getByRole('link', { name: 'Profil & Einstellungen' })
    fireEvent.click(screen.getByRole('link', { name: 'Neues Rezept' }))
    screen.getByText('editor page')
  })

  it('shows Start active, the wordmark, "+" button and avatar on /', () => {
    renderAt('/')
    expect(within(mainNav()).getByRole('link', { name: 'Start' }).getAttribute('aria-current')).toBe('page')
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBeNull()
    const banner = within(screen.getByRole('banner'))
    banner.getByText('Foodly')
    expect(banner.queryByText('Start')).toBeNull()
    banner.getByRole('link', { name: 'Profil & Einstellungen' })
    expect(screen.getByRole('link', { name: 'Neues Rezept' }).getAttribute('href')).toBe('/recipes/new')
  })

  it('does not mark Start current on the list', () => {
    renderAt('/recipes')
    expect(within(mainNav()).getByRole('link', { name: 'Start' }).getAttribute('aria-current')).toBeNull()
  })

  it('keeps "Rezepte" current on a category view (no category tabs)', () => {
    renderAt('/recipes?cat=2')
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('page')
  })

  it('keeps "Rezepte" active on a category page, with the "+" button', () => {
    renderAt('/categories/2')
    const tab = within(mainNav()).getByRole('link', { name: 'Rezepte' })
    expect(tab.getAttribute('aria-current')).toBe('location')
    expect(tab.className).toContain('text-foreground')
    expect(screen.getByRole('link', { name: 'Neues Rezept' }).getAttribute('href')).toBe('/recipes/new')
  })

  it('has no "+" button and no avatar on sub-pages', () => {
    renderAt('/recipes/5')
    screen.getByText('detail page')
    // still inside the "Rezepte" section, but not that page
    expect(within(mainNav()).getByRole('link', { name: 'Rezepte' }).getAttribute('aria-current')).toBe('location')
    mainNav()
    expect(screen.queryByRole('link', { name: 'Neues Rezept' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Profil & Einstellungen' })).toBeNull()
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

describe('Timer button in the header', () => {
  const openTimers = () => fireEvent.click(screen.getByRole('button', { name: 'Timer' }))

  it('opens a popover on the desktop', async () => {
    renderAt('/recipes')
    openTimers()
    const panel = await screen.findByRole('dialog', { name: 'Timer' })
    expect(panel.getAttribute('data-slot')).toBe('popover-content')
    within(panel).getByText('Kein Timer läuft.')
    expect(screen.getByRole('button', { name: 'Timer' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('opens a sheet on the phone', async () => {
    setViewport(375)
    renderAt('/recipes/1')
    openTimers()
    const panel = await screen.findByRole('dialog', { name: 'Timer' })
    expect(panel.getAttribute('data-test-id')).toBe('timer-sheet')
    expect(screen.getByRole('button', { name: 'Timer' }).getAttribute('aria-expanded')).toBe('true')

    // The header button toggles the sheet closed again.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Timer' }))
    openTimers()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Timer' })).toBeNull())
  })

  // Radix registers the outside-pointer listener of a freshly opened layer only after a tick.
  const openSheet = async () => {
    setViewport(375)
    renderAt('/recipes')
    openTimers()
    const panel = await screen.findByRole('dialog', { name: 'Timer' })
    await act(() => new Promise((r) => setTimeout(r, 0)))
    return panel
  }

  it('closes the phone sheet from the header button without reopening it', async () => {
    await openSheet()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Timer' }))
    openTimers()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Timer' })).toBeNull())
    expect(screen.getByRole('button', { name: 'Timer' }).getAttribute('aria-expanded')).toBe('false')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Timer' })))
  })

  it('keeps the phone sheet non-modal', async () => {
    await openSheet()
    // A modal sheet would hide the page from the accessibility tree and switch off its pointer events.
    screen.getByRole('button', { name: 'count 0' })
    expect(document.body.style.pointerEvents).not.toBe('none')
  })

  it('keeps the phone sheet open for a press on a toast, but not elsewhere', async () => {
    await openSheet()
    const toaster = document.createElement('div')
    toaster.setAttribute('data-sonner-toaster', '')
    toaster.innerHTML = '<button type="button">Stopp</button>'
    document.body.append(toaster)
    try {
      fireEvent.pointerDown(within(toaster).getByRole('button', { name: 'Stopp' }))
      expect(screen.getByRole('dialog', { name: 'Timer' })).toBeTruthy()

      fireEvent.pointerDown(document.body)
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Timer' })).toBeNull())
    } finally {
      toaster.remove()
    }
  })

  it('closes the phone sheet from "Schließen" and returns focus to the header button', async () => {
    const panel = await openSheet()
    fireEvent.click(within(panel).getByRole('button', { name: 'Schließen' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Timer' })).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Timer' })))
  })

  // Desktop focus return goes straight to the header button (it used to be looked up inside a span wrapper).
  const openPopover = async () => {
    renderAt('/recipes')
    openTimers()
    const panel = await screen.findByRole('dialog', { name: 'Timer' })
    await act(() => new Promise((r) => setTimeout(r, 0)))
    return panel
  }

  it('returns focus to the header button when the desktop popover closes with Escape', async () => {
    await openPopover()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Timer' })).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Timer' })))
  })

  it('closes the desktop popover from the header button without reopening it', async () => {
    await openPopover()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Timer' }))
    openTimers()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Timer' })).toBeNull())
    expect(screen.getByRole('button', { name: 'Timer' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the desktop popover from its ✕ and returns focus to the header button', async () => {
    const panel = await openPopover()
    expect(within(panel).getByRole('heading', { name: 'Timer' })).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Schließen' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Timer' })).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Timer' })))
  })

  it('lists a started timer above the form and removes it with ✕', async () => {
    const panel = await openPopover()
    fireEvent.click(within(panel).getByRole('button', { name: 'Starten' }))
    const bar = within(panel).getByRole('progressbar', { name: 'Fortschritt Timer' })
    const form = within(panel).getByRole('form', { name: 'Neuer Timer' })
    expect(bar.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(within(panel).getByRole('button', { name: 'Entfernen' }))
    within(panel).getByText('Kein Timer läuft.')
    expect(within(panel).queryByRole('progressbar')).toBeNull()
  })

  it('shows the countdown of a started timer', async () => {
    renderAt('/recipes')
    openTimers()
    const panel = await screen.findByRole('dialog', { name: 'Timer' })
    fireEvent.click(within(panel).getByRole('button', { name: '10 min' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Starten' }))
    expect(screen.getByRole('button', { name: 'Timer' }).textContent).toBe('10:00')
  })
})
