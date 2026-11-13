import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../../api'
import type { Recipe, RecipeId } from '../../api/protocol'
import { readRecentlyViewed } from '../../home/recentlyViewed'
import { RecentlyViewed } from './RecentlyViewed'

vi.mock('../../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useCategories: () => ({ list: [], status: 'ready', error: null }),
  useUser: () => undefined,
  useTags: () => ({ byId: {}, status: 'ready' }),
}))

function recipe(id: RecipeId): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    rating: [],
    name: `Rezept ${id}`,
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

function store(ids: RecipeId[]) {
  localStorage.setItem('foodly:recently-viewed:1', JSON.stringify({ version: 1, ids }))
}

function renderSection() {
  render(
    <MemoryRouter>
      <RecentlyViewed />
    </MemoryRouter>,
  )
}

const tileNames = () =>
  within(screen.getByRole('region', { name: 'Zuletzt angesehen' }))
    .getAllByRole('link')
    .map((a) => a.getAttribute('href'))

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('RecentlyViewed', () => {
  it('renders nothing without stored recipes', () => {
    const get = vi.spyOn(foodly, 'getRecipe')
    renderSection()
    expect(screen.queryByText('Zuletzt angesehen')).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })

  it('shows tile skeletons while loading', () => {
    store([1, 2])
    vi.spyOn(foodly, 'getRecipe').mockReturnValue(new Promise(() => {}))
    renderSection()
    screen.getByRole('heading', { name: 'Zuletzt angesehen' })
    expect(screen.getAllByTestId('tile-skeleton')).toHaveLength(2)
  })

  it('keeps the stored order even when answers arrive out of order', async () => {
    store([3, 1, 2])
    vi.spyOn(foodly, 'getRecipe').mockImplementation(
      (id) => new Promise((resolve) => setTimeout(() => resolve(recipe(id)), id === 3 ? 30 : 0)),
    )
    renderSection()
    await waitFor(() => expect(tileNames()).toEqual(['/recipes/3', '/recipes/1', '/recipes/2']))
  })

  it('asks for the first 6 only', async () => {
    store([1, 2, 3, 4, 5, 6, 7, 8])
    const get = vi.spyOn(foodly, 'getRecipe').mockImplementation((id) => Promise.resolve(recipe(id)))
    renderSection()
    await waitFor(() => expect(tileNames()).toHaveLength(6))
    expect(get.mock.calls.map((c) => c[0]).sort()).toEqual([1, 2, 3, 4, 5, 6])
    for (const call of get.mock.calls) expect(call).toHaveLength(1)
  })

  it('drops a recipe that fails to load and forgets it', async () => {
    store([1, 2, 3])
    vi.spyOn(foodly, 'getRecipe').mockImplementation((id) =>
      id === 2 ? Promise.reject(new Error('recipe 2 not found')) : Promise.resolve(recipe(id)),
    )
    renderSection()
    await waitFor(() => expect(tileNames()).toEqual(['/recipes/1', '/recipes/3']))
    expect(readRecentlyViewed(1)).toEqual([1, 3])
  })

  it('renders nothing and keeps the list when every recipe fails', async () => {
    store([1, 2])
    const get = vi.spyOn(foodly, 'getRecipe').mockRejectedValue(new Error('offline'))
    renderSection()
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByText('Zuletzt angesehen')).toBeNull())
    expect(readRecentlyViewed(1)).toEqual([1, 2])
  })
})
