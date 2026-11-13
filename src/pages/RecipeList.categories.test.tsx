import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './RecipeList'
import { foodly } from '../api'
import type { Recipe, UserCategory } from '../api/protocol'

// The categories state is swapped per test (loading / ready / error); rerendering picks up the change.
const catalog = vi.hoisted(() => ({
  categories: { list: [] as unknown[], status: 'loading', error: null as Error | null, retry: () => {} },
}))
vi.mock('../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useUser: () => undefined,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
  useCategories: () => catalog.categories,
}))

function cat(id: number, recipes: number[]): UserCategory {
  return { id, user: 1, name: `Cat ${id}`, recipes, order: id, color: '#000000', colorLight: null, colorDark: null }
}

function rec(id: number, name: string): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    name,
    tags: [],
    source: null,
    rating: [],
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

function list(url: string) {
  const ui = () => (
    <MemoryRouter initialEntries={[url]}>
      <TooltipProvider>
        <RecipeList />
      </TooltipProvider>
    </MemoryRouter>
  )
  const view = render(ui())
  return {
    settle: (next: Partial<typeof catalog.categories>) => {
      catalog.categories = { ...catalog.categories, ...next }
      view.rerender(ui())
    },
  }
}

// Captures the sentinel's IntersectionObserver, so a test can tell whether the list would page on.
let intersect: IntersectionObserverCallback | null = null
class CapturingIO {
  constructor(cb: IntersectionObserverCallback) {
    intersect = cb
  }
  observe() {}
  unobserve() {}
  disconnect() {
    intersect = null
  }
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  catalog.categories = { list: [], status: 'loading', error: null, retry: () => {} }
  intersect = null
  vi.stubGlobal('IntersectionObserver', CapturingIO)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('RecipeList while the categories load', () => {
  it('holds a category filter back until the categories are there, without paging on', async () => {
    const search = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValue({ items: [rec(1, 'Pancakes'), rec(2, 'Suppe')], cursor: 2 })
    const view = list('/recipes?cat=3&group=0')

    await screen.findByTestId('list-categories-skeleton')
    expect(screen.queryByText(/Keine Treffer/)).toBeNull()
    expect(screen.queryByText('Pancakes')).toBeNull()
    // No chip without a name yet.
    expect(screen.queryByText('#3')).toBeNull()
    expect(intersect).toBeNull()
    expect(search).toHaveBeenCalledTimes(1)

    view.settle({ list: [cat(3, [2])], status: 'ready' })
    await screen.findByText('Suppe')
    expect(screen.queryByText('Pancakes')).toBeNull()
    expect(screen.queryByTestId('list-categories-skeleton')).toBeNull()
    // The gate lifted: the sentinel pages on again.
    expect(intersect).not.toBeNull()
  })

  it('shows the grouped view only once the categories are there', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    const view = list('/recipes?group=1')

    await screen.findByTestId('list-categories-skeleton')
    expect(screen.queryByText('Ohne Kategorie')).toBeNull()

    view.settle({ list: [cat(3, [1])], status: 'ready' })
    await screen.findByText('Pancakes')
    screen.getByRole('button', { name: /Cat 3/ })
  })

  it('does not wait for the categories in a flat list without a category filter', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    list('/recipes?group=0')
    await screen.findByText('Pancakes')
    expect(screen.queryByTestId('list-categories-skeleton')).toBeNull()
  })

  it('restores the scroll position only after the categories are there', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    sessionStorage.setItem('recipeList:scroll', JSON.stringify({ list: 'cat=3&group=0', y: 640 }))
    const view = list('/recipes?cat=3&group=0')

    await screen.findByTestId('list-categories-skeleton')
    await act(async () => {})
    expect(scrollTo).not.toHaveBeenCalledWith(0, 640)

    view.settle({ list: [cat(3, [1])], status: 'ready' })
    await screen.findByText('Pancakes')
    expect(scrollTo).toHaveBeenCalledWith(0, 640)
  })
})

describe('RecipeList when the categories fail', () => {
  it('shows an alert with a retry and lists the recipes flat, ignoring the category filter', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes'), rec(2, 'Suppe')], cursor: null })
    const retry = vi.fn()
    catalog.categories = { list: [], status: 'error', error: new Error('Serverfehler'), retry }
    list('/recipes?cat=3&group=1')

    await screen.findByText('Konnte Kategorien nicht laden')
    screen.getByText('Serverfehler')
    await screen.findByText('Pancakes')
    screen.getByText('Suppe')
    expect(screen.queryByText('Ohne Kategorie')).toBeNull()
    expect(screen.queryByText('#3')).toBeNull()
    // The ignored selection leaves the Kategorie button empty; its popover says why there is nothing to pick.
    fireEvent.click(screen.getByRole('button', { name: 'Kategorie' }))
    screen.getByText('Kategorien nicht verfügbar')
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Kategorie' }), { key: 'Escape' })

    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('still tells an empty collection apart from a filter without matches', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [], cursor: null })
    catalog.categories = { list: [], status: 'error', error: new Error('Serverfehler'), retry: () => {} }
    list('/recipes?cat=3&group=0')

    await waitFor(() => screen.getByText('Noch keine Rezepte.'))
    expect(screen.queryByText(/Keine Treffer/)).toBeNull()
  })
})
