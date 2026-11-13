// Load states and the back link, against a stand-in catalog. The full flows run in mock mode: Categories.mock.test.tsx.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Categories } from './Categories'
import type { UserCategory } from '../api/protocol'

const catalog = vi.hoisted(() => ({
  categories: { list: [] as UserCategory[], status: 'ready', error: null as Error | null, retry: vi.fn() },
}))

vi.mock('../catalog/CatalogProvider', () => ({
  useCategories: () => catalog.categories,
  useCurrentUserId: () => 1,
}))
vi.mock('../catalog/useCategoryActions', () => ({
  useCategoryActions: () => ({
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn().mockResolvedValue(undefined),
  }),
}))

function renderPage() {
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={['/categories']}>
        <Routes>
          <Route path="/categories" element={<Categories />} />
          <Route path="/recipes" element={<p>Rezeptliste</p>} />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  )
}

beforeEach(() => {
  catalog.categories = { list: [], status: 'ready', error: null, retry: vi.fn() }
})

describe('Categories page states', () => {
  it('shows skeleton rows while loading', () => {
    catalog.categories.status = 'loading'
    renderPage()
    expect(screen.getAllByTestId('category-row-skeleton')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Neue Kategorie' })).toBeNull()
  })

  it('offers a retry when loading failed', () => {
    catalog.categories.status = 'error'
    catalog.categories.error = new Error('Server weg')
    renderPage()
    expect(screen.getByText('Konnte Kategorien nicht laden')).toBeTruthy()
    expect(screen.getByText('Server weg')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(catalog.categories.retry).toHaveBeenCalled()
  })

  it('invites to create the first category when there is none', () => {
    renderPage()
    expect(screen.getByText('Noch keine Kategorien. Leg eine an und sammle darin Rezepte.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Neue Kategorie' }))
    expect(screen.getByRole('heading', { name: 'Neue Kategorie' })).toBeTruthy()
  })

  it('counts one recipe in the singular', () => {
    catalog.categories.list = [
      { id: 3, user: 1, name: 'Suppen', recipes: [7], order: 0, color: '#16a34a', colorLight: null, colorDark: null },
    ]
    renderPage()
    expect(screen.getByText('1 Rezept')).toBeTruthy()
  })

  it('goes back to the recipe list without app history', () => {
    renderPage()
    const back = screen.getByRole('link', { name: '← Zurück' })
    expect(back.getAttribute('href')).toBe('/recipes')
    fireEvent.click(back)
    expect(screen.getByText('Rezeptliste')).toBeTruthy()
  })

  describe('move items', () => {
    const category = (id: number, name: string, order: number): UserCategory => ({
      id,
      user: 1,
      name,
      recipes: [],
      order,
      color: '#16a34a',
      colorLight: null,
      colorDark: null,
    })
    const itemsFor = async (name: string) => {
      fireEvent.keyDown(screen.getByRole('button', { name: `Aktionen für „${name}“` }), { key: 'Enter' })
      const items = (await screen.findAllByRole('menuitem')).map((item) => item.textContent)
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
      return items
    }

    it('leaves out „Nach oben“ on the first row and „Nach unten“ on the last', async () => {
      catalog.categories.list = [category(1, 'Erste', 0), category(2, 'Mitte', 1), category(3, 'Letzte', 2)]
      renderPage()
      expect(await itemsFor('Erste')).toEqual(['Bearbeiten', 'Nach unten', 'Löschen'])
      expect(await itemsFor('Mitte')).toEqual(['Bearbeiten', 'Nach oben', 'Nach unten', 'Löschen'])
      expect(await itemsFor('Letzte')).toEqual(['Bearbeiten', 'Nach oben', 'Löschen'])
    })

    it('offers no move with a single category', async () => {
      catalog.categories.list = [category(1, 'Einzige', 0)]
      renderPage()
      expect(await itemsFor('Einzige')).toEqual(['Bearbeiten', 'Löschen'])
    })
  })
})
