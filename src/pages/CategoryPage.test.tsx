// The page against a catalog that changes under it: the mock-mode tests can only remount the page.
import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CategoryPage } from './CategoryPage'
import type { UserCategory } from '../api/protocol'

const CATEGORY: UserCategory = {
  id: 2,
  user: 1,
  name: 'Favoriten',
  recipes: [],
  order: 0,
  color: '#e11d48',
  colorLight: null,
  colorDark: null,
}
const catalog = vi.hoisted(() => ({ categories: { status: 'ready', list: [] as unknown[] } }))

vi.mock('../catalog/CatalogProvider', () => ({
  useCategories: () => catalog.categories,
  useCurrentUserId: () => 1,
}))
vi.mock('../hooks/useRecipeSearch', () => ({
  useRecipeSearch: () => ({
    recipes: [],
    status: 'ready',
    error: null,
    hasMore: false,
    loadingMore: false,
    loadMoreError: null,
    loadMore: () => undefined,
    retryLoadMore: () => undefined,
    reload: () => undefined,
  }),
}))

const page = () => (
  <TooltipProvider>
    <MemoryRouter initialEntries={['/categories/2']}>
      <Routes>
        <Route path="/categories/:id" element={<CategoryPage />} />
      </Routes>
    </MemoryRouter>
  </TooltipProvider>
)

// jsdom's scrollTo returns undefined; some browsers return a Promise, which an expression-bodied effect hands to React
// as its cleanup (#211).
function mockScrollToReturningPromise() {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => Promise.resolve() as unknown as void)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
}
const effectReturnWarnings = () =>
  vi
    .mocked(console.error)
    .mock.calls.filter((args) =>
      args.some((arg) => String(arg).includes('must not return anything besides a function')),
    )

describe('CategoryPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('turns into "Kategorie nicht gefunden" when the open category leaves the catalog', () => {
    catalog.categories = { status: 'ready', list: [CATEGORY] }
    const { rerender } = render(page())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Favoriten')

    catalog.categories = { status: 'ready', list: [] }
    rerender(page())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Kategorie nicht gefunden')
    expect(screen.getByRole('link', { name: 'Zu den Rezepten' })).toBeTruthy()
  })

  it('asks for a recipe or ingredient in its search, like the list', () => {
    catalog.categories = { status: 'ready', list: [CATEGORY] }
    render(page())
    expect(screen.getByRole('textbox', { name: 'In „Favoriten“ suchen' }).getAttribute('placeholder')).toBe(
      'Rezept oder Zutat suchen',
    )
  })

  it('has a generic h1 while the categories load', () => {
    catalog.categories = { status: 'loading', list: [] }
    render(page())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Kategorie')
    expect(screen.getByTestId('category-head-skeleton')).toBeTruthy()
  })

  it('does not call a category empty when only its recipes are out of sight', () => {
    catalog.categories = { status: 'ready', list: [{ ...CATEGORY, recipes: [7] }] }
    render(page())
    expect(screen.getByText('Keine Rezepte, die du sehen kannst.')).toBeTruthy()
    expect(screen.queryByText(/Noch nichts in/)).toBeNull()
  })

  it('opens and leaves a category when scrollTo returns a Promise (StrictMode runs the cleanup on mount)', () => {
    mockScrollToReturningPromise()
    catalog.categories = { status: 'ready', list: [CATEGORY] }
    const { unmount } = render(<StrictMode>{page()}</StrictMode>)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Favoriten')
    expect(() => unmount()).not.toThrow()
    expect(effectReturnWarnings()).toHaveLength(0)
  })

  it('leaves a category without an error when scrollTo returns a Promise', () => {
    mockScrollToReturningPromise()
    catalog.categories = { status: 'ready', list: [CATEGORY] }
    const { unmount } = render(page())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Favoriten')
    expect(effectReturnWarnings()).toHaveLength(0)
    expect(() => unmount()).not.toThrow()
  })
})
