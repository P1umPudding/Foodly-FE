import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../../api'
import type { Recipe, RecipeId, UserId } from '../../api/protocol'
import { SharedWithYou } from './SharedWithYou'

const users = vi.hoisted(() => ({ names: {} as Record<number, string> }))
vi.mock('../../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useUser: (id: number) => (users.names[id] ? { id, name: users.names[id], profilePicture: null } : undefined),
  useTags: () => ({ byId: {}, status: 'ready' }),
}))

function recipe(id: RecipeId, owner: UserId = 2, withPhoto = false): Recipe {
  return {
    id,
    owner,
    editors: [],
    viewers: [1],
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
    mainImage: withPhoto ? { id: 1, hash: 'ab12', name: null } : null,
    images: [],
    sections: [],
  }
}

const page = (items: Recipe[]) => ({ items, cursor: null })

function renderSection() {
  return render(
    <MemoryRouter>
      <SharedWithYou />
    </MemoryRouter>,
  )
}

const region = () => screen.getByRole('region', { name: 'Geteilt mit dir' })
const rowLinks = () => within(region()).queryAllByRole('link')

afterEach(() => {
  vi.restoreAllMocks()
  users.names = {}
})

describe('SharedWithYou', () => {
  it('asks for recipes shared with me as editor or viewer, newest share first', async () => {
    const search = vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([recipe(1)]))
    renderSection()
    await waitFor(() => expect(rowLinks()).toHaveLength(1))
    expect(search).toHaveBeenCalledWith(
      { filters: { accessRights: ['editor', 'viewer'] }, sort: { field: 'accessSince', order: 'desc' } },
      1,
    )
  })

  it('shows at most 3, in server order, each with "von <Name>"', async () => {
    users.names = { 2: 'Mara', 3: 'Jonas' }
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(
      page([recipe(14, 2), recipe(11, 3), recipe(9, 2), recipe(7, 3), recipe(3, 2)]),
    )
    renderSection()
    await waitFor(() => expect(rowLinks()).toHaveLength(3))
    const links = rowLinks()
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/recipes/14', '/recipes/11', '/recipes/9'])
    expect(links.map((a) => within(a).getByText(/^Rezept/).textContent)).toEqual(['Rezept 14', 'Rezept 11', 'Rezept 9'])
    expect(links.map((a) => within(a).getByText(/^von /).textContent)).toEqual(['von Mara', 'von Jonas', 'von Mara'])
  })

  it('renders no block without shared recipes', async () => {
    const search = vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([]))
    const { container } = renderSection()
    await waitFor(() => expect(search).toHaveBeenCalled())
    await waitFor(() => expect(container.innerHTML).toBe(''))
    expect(screen.queryByRole('region', { name: 'Geteilt mit dir' })).toBeNull()
  })

  it('leaves out "von" while the owner is unknown', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([recipe(5, 4)]))
    renderSection()
    const link = await within(await screen.findByRole('region', { name: 'Geteilt mit dir' })).findByRole('link', {
      name: /Rezept 5/,
    })
    expect(within(link).queryByText(/von/)).toBeNull()
  })

  it('has no image column when none of the shown recipes has a photo', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([recipe(1), recipe(2), recipe(3)]))
    renderSection()
    await waitFor(() => expect(rowLinks()).toHaveLength(3))
    expect(screen.queryAllByTestId('shared-thumb')).toHaveLength(0)
  })

  it('ignores a photo on a recipe that is not shown', async () => {
    // Only the 3 shown recipes decide whether there is an image column.
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([recipe(1), recipe(2), recipe(3), recipe(4, 2, true)]))
    renderSection()
    await waitFor(() => expect(rowLinks()).toHaveLength(3))
    expect(screen.queryAllByTestId('shared-thumb')).toHaveLength(0)
  })

  it('shows a thumbnail on all rows when a shown recipe has a photo', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page([recipe(1), recipe(2, 2, true), recipe(3)]))
    renderSection()
    await waitFor(() => expect(rowLinks()).toHaveLength(3))
    const thumbs = screen.getAllByTestId('shared-thumb')
    expect(thumbs).toHaveLength(3)
    // The small (sm, 36 px) thumb of the recipe row: the photo, or the cutlery placeholder for a recipe without one.
    expect(thumbs.every((t) => /\bsize-9\b/.test(t.className))).toBe(true)
    expect(thumbs.map((t) => (t.querySelector('img') ? 'photo' : 'placeholder'))).toEqual([
      'placeholder',
      'photo',
      'placeholder',
    ])
    expect(thumbs.map((t) => t.querySelector('.lucide-utensils-crossed') !== null)).toEqual([true, false, true])
  })

  it('shows row skeletons while loading', () => {
    vi.spyOn(foodly, 'searchRecipes').mockReturnValue(new Promise(() => {}))
    renderSection()
    expect(region().getAttribute('aria-busy')).toBe('true')
    within(region()).getByTestId('shared-skeleton')
    // Same line heights as a real row (body name line, text-sm meta line), so the card doesn't jump on load.
    const lines = within(region()).getAllByTestId('shared-skeleton-line')
    expect(lines).toHaveLength(6)
    expect(lines.every((l) => l.className.split(/\s+/).includes('h-lh'))).toBe(true)
    expect(lines.filter((l) => l.className.split(/\s+/).includes('text-sm'))).toHaveLength(3)
  })

  it('shows an error with retry, and retrying loads again', async () => {
    const search = vi
      .spyOn(foodly, 'searchRecipes')
      .mockRejectedValueOnce(new Error('Server weg'))
      .mockResolvedValueOnce(page([recipe(8)]))
    renderSection()
    const retry = await within(await screen.findByRole('region', { name: 'Geteilt mit dir' })).findByRole('button', {
      name: /erneut/i,
    })
    screen.getByText('Server weg')
    fireEvent.click(retry)
    await waitFor(() => expect(rowLinks()).toHaveLength(1))
    expect(search).toHaveBeenCalledTimes(2)
  })
})
