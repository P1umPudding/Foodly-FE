import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

// The category row has its own tests (RecipeDetail.categories); here it would only need more catalog mocks.
vi.mock('../components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))

// The size lives in the URL; this keeps it in component state, so the steppers re-render the amounts.
vi.mock('react-router-dom', async () => {
  const { useState } = await vi.importActual<typeof import('react')>('react')
  return {
    useSearchParams: () => {
      const [params, setParams] = useState(() => new URLSearchParams())
      return [params, (next: URLSearchParams | ((p: URLSearchParams) => URLSearchParams)) => setParams(next)]
    },
    useLocation: () => ({ key: 'default' }),
    useParams: () => ({ id: '5' }),
    useNavigate: () => vi.fn(),
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  }
})

vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
  useUsers: () => [],
}))

function recipe(over: Partial<Recipe> = {}): Recipe {
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
    sizeNumber: null,
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
    ...over,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

// Old data can carry 0 or a negative portion count: scaling by it must not show Infinity, NaN or negative amounts.
describe('RecipeDetail with a portion count of 0 or below', () => {
  it.each([0, -2])('scales in multiplier mode for %s', async (sizeNumber) => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe({ sizeNumber }))

    render(
      <TooltipProvider>
        <RecipeDetail />
      </TooltipProvider>,
    )

    await waitFor(() => screen.getByText('Base'))
    expect(screen.getByLabelText('Mengen-Faktor')).toBeTruthy()
    expect(screen.queryByLabelText('Portionen')).toBeNull()

    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(screen.getByText(/300/)).toBeTruthy() // ×1.5
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/Infinity|NaN|[-−]\d/)
  })
})
