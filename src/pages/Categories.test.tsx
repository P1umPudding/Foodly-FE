// Load states and the back link, against a stand-in catalog. The full flows run in mock mode: Categories.mock.test.tsx.
import { fireEvent, render, screen } from '@testing-library/react'
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
  useCategoryActions: () => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn() }),
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
})
