import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

// The category row has its own tests (RecipeDetail.categories); here it would only need more catalog mocks.
vi.mock('../components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useLocation: () => ({ key: 'default' }),
  useParams: () => ({ id: '5' }),
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

// RecipeDetail renders TagText/TagChips (catalog) and an un-provisioned Tooltip
// (the "Abhaken" toggle) outside of the app root, so both contexts need a stand-in.
const refreshCategories = vi.hoisted(() => vi.fn())
vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => refreshCategories,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
  useUsers: () => [],
}))

function recipe(id: number): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    name: 'Base',
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

afterEach(() => {
  vi.restoreAllMocks()
  navigate.mockReset()
  refreshCategories.mockClear()
})

describe('RecipeDetail clone', () => {
  it('copies the recipe and navigates to the new one', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(5))
    vi.spyOn(foodly, 'copyRecipe').mockResolvedValue(recipe(99))

    render(
      <TooltipProvider>
        <RecipeDetail />
      </TooltipProvider>,
    )
    await waitFor(() => screen.getByText('Base'))

    fireEvent.click(screen.getByRole('button', { name: /kopie erstellen/i }))

    await waitFor(() => expect(foodly.copyRecipe).toHaveBeenCalledWith(5))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/recipes/99'))
    expect(refreshCategories).toHaveBeenCalledTimes(1)
  })

  it('leaves the categories alone when the copy fails', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(5))
    vi.spyOn(foodly, 'copyRecipe').mockRejectedValue(new Error('Kaputt'))

    render(
      <TooltipProvider>
        <RecipeDetail />
      </TooltipProvider>,
    )
    await waitFor(() => screen.getByText('Base'))

    fireEvent.click(screen.getByRole('button', { name: /kopie erstellen/i }))

    await screen.findByText('Kaputt')
    expect(refreshCategories).not.toHaveBeenCalled()
  })
})
