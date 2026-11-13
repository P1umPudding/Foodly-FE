import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'
import { pushRecentlyViewed, readRecentlyViewed } from '../home/recentlyViewed'

vi.mock('../components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ key: 'default' }),
  useParams: () => ({ id: '5' }),
  useNavigate: () => () => {},
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}))

vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

function recipe(): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    rating: [],
    name: 'Base',
    tags: [],
    source: null,
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: 2,
    sizeText: 'Portionen',
    notes: [],
    mainImage: null,
    images: [],
    sections: [
      {
        id: 1,
        name: null,
        steps: [],
        ingredients: [{ id: 1, ingredient: null, text: 'Mehl', amount: '200', amountPrefix: null, unit: 'g' }],
      },
    ],
  }
}

function renderDetail() {
  render(
    <TooltipProvider>
      <RecipeDetail />
    </TooltipProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('RecipeDetail remembers the recipe as recently viewed', () => {
  it('stores the id once the recipe has loaded', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    renderDetail()
    await waitFor(() => screen.getByText('Base'))
    expect(readRecentlyViewed(1)).toEqual([5])
  })

  it('does not store a recipe that failed to load (e.g. 404)', async () => {
    vi.spyOn(foodly, 'getRecipe').mockRejectedValue(new Error('recipe 5 not found'))
    renderDetail()
    await waitFor(() => screen.getByText('Rezept nicht gefunden'))
    expect(readRecentlyViewed(1)).toEqual([])
  })

  it('does not store it again when the portions change', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    renderDetail()
    await waitFor(() => screen.getByText('Base'))
    // Another recipe opened in between: a second push of 5 would put it back in front.
    pushRecentlyViewed(1, 99)
    fireEvent.click(screen.getByLabelText('Mehr'))
    await waitFor(() => screen.getByText(/300/))
    expect(readRecentlyViewed(1)).toEqual([99, 5])
  })

  it('forgets the recipe once it is deleted', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'deleteRecipe').mockResolvedValue()
    renderDetail()
    await waitFor(() => screen.getByText('Base'))
    pushRecentlyViewed(1, 99)
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    const dialog = within(await screen.findByRole('alertdialog'))
    fireEvent.click(dialog.getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(readRecentlyViewed(1)).toEqual([99]))
  })
})
