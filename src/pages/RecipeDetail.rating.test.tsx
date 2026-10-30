import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '5' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

function recipe(rating: Recipe['rating']): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    name: 'Base',
    tags: [],
    source: null,
    rating,
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

afterEach(() => vi.restoreAllMocks())

describe('RecipeDetail rating', () => {
  it('offers a first rating and shows the saved one without a reload', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe([]))
    vi.spyOn(foodly, 'setMyRating').mockResolvedValue(recipe([{ user: 1, rating: 4 }]))

    render(
      <TooltipProvider>
        <RecipeDetail />
      </TooltipProvider>,
    )
    fireEvent.click(await screen.findByText('Bewerten'))
    fireEvent.click(await screen.findByRole('button', { name: '4 von 5' }))

    await waitFor(() => expect(screen.queryByText('Bewerten')).toBeNull())
    expect(screen.getByRole('button', { name: 'Bewertung 4,0 von 5' })).toBeTruthy()
    expect(foodly.getRecipe).toHaveBeenCalledTimes(1)
  })
})
