import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '5' }),
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

// RecipeDetail renders TagText/TagChips (catalog) and an un-provisioned Tooltip
// (the "Abhaken" toggle) outside of the app root, so both contexts need a stand-in.
vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
}))

function recipe(id: number): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
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

    fireEvent.click(screen.getByRole('button', { name: /duplizieren/i }))

    await waitFor(() => expect(foodly.copyRecipe).toHaveBeenCalledWith(5))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/recipes/99'))
  })
})
