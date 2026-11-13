import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CategoryTiles } from './CategoryTiles'
import { HomeSectionsProvider, NothingToShow } from './HomeSections'
import type { UserCategory } from '../../api/protocol'

const catalog = vi.hoisted(() => ({
  categories: { list: [] as UserCategory[], status: 'ready', error: null as Error | null, retry: vi.fn() },
}))

vi.mock('../../catalog/CatalogProvider', () => ({ useCategories: () => catalog.categories }))

const category = (id: number, name: string, order: number | null, recipes: number[]): UserCategory => ({
  id,
  user: 1,
  name,
  recipes,
  order,
  color: '#3b82f6',
  colorLight: null,
  colorDark: null,
})

function renderTiles() {
  render(
    <MemoryRouter>
      <HomeSectionsProvider>
        <CategoryTiles />
        <NothingToShow />
      </HomeSectionsProvider>
    </MemoryRouter>,
  )
}

const nothingToShow = 'Hier erscheinen deine Kategorien und Rezepte, die du zuletzt erstellt oder angesehen hast.'

beforeEach(() => {
  catalog.categories = { list: [], status: 'ready', error: null, retry: vi.fn() }
})

describe('CategoryTiles', () => {
  it('shows the categories in `order` with name and count, each linking to its page', () => {
    catalog.categories.list = [
      category(7, 'Backen', 2, [1, 2, 3]),
      category(3, 'Favoriten', 0, [4]),
      category(5, 'Schnelle Küche', 1, []),
    ]
    renderTiles()
    const links = screen.getAllByRole('link').filter((l) => l.textContent !== 'Verwalten')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/categories/3', '/categories/5', '/categories/7'])
    screen.getByRole('link', { name: 'Favoriten, 1 Rezept' })
    screen.getByRole('link', { name: 'Schnelle Küche, 0 Rezepte' })
    const backen = screen.getByRole('link', { name: 'Backen, 3 Rezepte' })
    expect(backen.hasAttribute('data-cat')).toBe(true)
    expect(screen.queryByText(nothingToShow)).toBeNull()
  })

  it('links "Verwalten" to the categories page', () => {
    catalog.categories.list = [category(1, 'Favoriten', 0, [])]
    renderTiles()
    expect(screen.getByRole('link', { name: 'Verwalten' }).getAttribute('href')).toBe('/categories')
  })

  it('hides itself without categories, leaving the "nothing to show" card', () => {
    renderTiles()
    expect(screen.queryByRole('heading', { name: 'Kategorien' })).toBeNull()
    screen.getByText(nothingToShow)
  })

  it('shows four tile skeletons while loading', () => {
    catalog.categories.status = 'loading'
    renderTiles()
    screen.getByRole('heading', { name: 'Kategorien' })
    expect(screen.getAllByTestId('category-tile-skeleton')).toHaveLength(4)
    expect(screen.queryByText(nothingToShow)).toBeNull()
  })

  it('shows a retry alert on error', () => {
    catalog.categories.status = 'error'
    catalog.categories.error = new Error('Server weg')
    renderTiles()
    screen.getByText('Konnte „Kategorien“ nicht laden')
    screen.getByText('Server weg')
    expect(screen.queryByRole('link')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(catalog.categories.retry).toHaveBeenCalledOnce()
  })
})
