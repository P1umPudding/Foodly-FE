import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../../api'
import type { Recipe, RecipeId } from '../../api/protocol'
import { savePersisted } from '../../list/persistence'
import { DEFAULT_STATE } from '../../list/state'
import { RecentlyEdited } from './RecentlyEdited'

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
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
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

const page = (ids: RecipeId[]) => ({ items: ids.map(recipe), cursor: null })

function renderSection() {
  render(
    <MemoryRouter useTransitions={false}>
      <RecentlyEdited />
    </MemoryRouter>,
  )
}

const region = () => screen.getByRole('region', { name: 'Zuletzt bearbeitet' })
// The region also holds the "Alle Rezepte" link; only recipe tiles link to /recipes/<id>.
const tileHrefs = () =>
  within(region())
    .getAllByRole('link')
    .map((a) => a.getAttribute('href'))
    .filter((href) => /^\/recipes\/\d+$/.test(href ?? ''))

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('RecentlyEdited', () => {
  it('asks for all recipes, last edited first', async () => {
    const search = vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([1]))
    renderSection()
    await waitFor(() => expect(tileHrefs()).toEqual(['/recipes/1']))
    expect(search).toHaveBeenCalledWith({ sort: { field: 'updatedAt', order: 'desc' } }, 1)
  })

  it('shows the first 6 in the order the server sent them', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([8, 3, 5, 1, 7, 2, 6, 4]))
    renderSection()
    await waitFor(() =>
      expect(tileHrefs()).toEqual(['/recipes/8', '/recipes/3', '/recipes/5', '/recipes/1', '/recipes/7', '/recipes/2']),
    )
  })

  it('links "Alle Rezepte" to the whole list, in the saved view', async () => {
    savePersisted(1, { ...DEFAULT_STATE, sortKey: 'work', sortDir: 'desc' })
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([1]))
    renderSection()
    const link = await within(await screen.findByRole('region', { name: 'Zuletzt bearbeitet' })).findByRole('link', {
      name: 'Alle Rezepte',
    })
    const [path, query] = link.getAttribute('href')!.split('?')
    const params = new URLSearchParams(query)
    expect(path).toBe('/recipes')
    expect(params.get('role')).toBeNull()
    expect(params.get('sort')).toBe('work')
    expect(params.get('dir')).toBe('desc')
  })

  it('shows tile skeletons while loading', () => {
    vi.spyOn(foodly, 'searchRecipes').mockReturnValue(new Promise(() => {}))
    renderSection()
    expect(region().getAttribute('aria-busy')).toBe('true')
    expect(screen.getAllByTestId('tile-skeleton')).toHaveLength(6)
  })

  it('renders nothing without recipes', async () => {
    const search = vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([]))
    renderSection()
    await waitFor(() => expect(search).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText('Zuletzt bearbeitet')).toBeNull())
  })

  it('shows the error and loads again on retry', async () => {
    vi.spyOn(foodly, 'searchRecipes')
      .mockRejectedValueOnce(new Error('Server nicht erreichbar'))
      .mockResolvedValue(page([2]))
    renderSection()
    await screen.findByText('Server nicht erreichbar')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    await waitFor(() => expect(tileHrefs()).toEqual(['/recipes/2']))
  })
})
