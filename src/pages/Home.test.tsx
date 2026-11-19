import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../api'
import { Home } from './Home'
import type { Recipe, RecipeSearchQuery, UserCategory } from '../api/protocol'

const me = vi.hoisted(() => ({ current: { id: 1, name: 'Kolja Beispiel', profilePicture: null } as unknown }))
const categories = vi.hoisted(() => ({
  current: { list: [] as UserCategory[], status: 'ready', error: null as Error | null, retry: () => {} },
}))
vi.mock('../catalog/CatalogProvider', () => ({
  useMe: () => me.current,
  useCurrentUserId: () => 1,
  useCategories: () => categories.current,
  useUser: () => undefined,
  useTags: () => ({ byId: {}, status: 'ready' }),
}))

function sharedRecipe(id: number): Recipe {
  return {
    id,
    owner: 2,
    editors: [],
    viewers: [1],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    rating: [],
    name: `Geteilt ${id}`,
    tags: [],
    source: null,
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: null,
    sizeText: null,
    notes: [],
    mainImage: null,
    images: [],
    sections: [],
  }
}

// Only the shared-with-me query gets results: "Zuletzt erstellt" (owner) stays empty.
function stubSharedOnly(ids: number[]) {
  vi.spyOn(foodly, 'searchRecipes').mockImplementation(async (q: RecipeSearchQuery) =>
    q.filters?.accessRights?.includes('owner')
      ? { items: [], cursor: null }
      : { items: ids.map(sharedRecipe), cursor: null },
  )
}

const mainColumn = () => document.querySelector<HTMLElement>('[data-slot="home-main"]')!
const sideColumn = () => document.querySelector<HTMLElement>('[data-slot="home-side"]')!

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
  // "Zuletzt erstellt" loads on mount; without own recipes it hides itself.
  vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [], cursor: null })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
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

  it('shows the "nothing to show" card while no section has content', async () => {
    renderHome()
    const card = (
      await screen.findByText(
        'Hier erscheinen deine Kategorien und Rezepte, die du zuletzt erstellt oder angesehen hast.',
      )
    ).parentElement!
    // One action at most (design.md §5): only "Neues Rezept"; the list is one click away in the navigation.
    expect(within(card).queryByRole('link', { name: 'Alle Rezepte' })).toBeNull()
    expect(within(card).getByText('Noch nichts zu sehen')).toBeTruthy()
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
    expect(screen.getByRole('heading', { level: 1, name: /Kolja/ }).getAttribute('data-slot')).toBe('page-title')
    const header = screen.getByRole('heading', { level: 2, name: 'Kategorien' }).closest('[data-slot="section-header"]')
    expect(header).not.toBeNull()
    within(header as HTMLElement).getByRole('link', { name: 'Verwalten' })
    expect(screen.getByRole('link', { name: 'Favoriten, 2 Rezepte' }).getAttribute('href')).toBe('/categories/4')
    expect(screen.queryByRole('link', { name: 'Alle Rezepte' })).toBeNull()
  })

  describe('Geteilt mit dir', () => {
    it('sits in the side column, which only becomes a column from 1100 px and when both columns have content', async () => {
      stubSharedOnly([14, 11])
      renderHome()
      const region = await screen.findByRole('region', { name: 'Geteilt mit dir' })
      expect(sideColumn().contains(region)).toBe(true)
      // jsdom can't evaluate `:has` / `:empty`, so this only guards the classes; the screenshots check the selectors.
      const grid = sideColumn().parentElement!
      expect(grid).toBe(mainColumn().parentElement)
      expect(grid.className.split(/\s+/)).toEqual(
        expect.arrayContaining([
          'grid',
          'not-has-[section]:hidden',
          'min-[1100px]:not-has-[>:empty]:grid-cols-[minmax(0,1fr)_300px]',
        ]),
      )
      expect(mainColumn().className.split(/\s+/)).toContain('empty:hidden')
      expect(sideColumn().className.split(/\s+/)).toContain('empty:hidden')
      // Without own or viewed recipes the main column is empty, so the shared block takes the full width.
      await waitFor(() => expect(mainColumn().innerHTML).toBe(''))
      expect(screen.queryByText('Noch nichts zu sehen')).toBeNull()
    })

    it('leaves the side column empty without shared recipes', async () => {
      renderHome()
      await screen.findByText('Noch nichts zu sehen')
      await waitFor(() => expect(sideColumn().innerHTML).toBe(''))
    })
  })
})
