import { render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '5' }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}))

let currentUserId: number | null = 1
vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => currentUserId,
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
    sizeText: null,
    notes: [],
    mainImage: null,
    images: [],
    sections: [],
    ...over,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  currentUserId = 1
})

describe('RecipeDetail edit entry point', () => {
  it('links the owner to the editor', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())

    render(
      <TooltipProvider>
        <RecipeDetail />
      </TooltipProvider>,
    )

    await waitFor(() => screen.getByText('Base'))
    const link = screen.getByRole('link', { name: /bearbeiten/i })
    expect(link.getAttribute('href')).toBe('/recipes/5/edit')
  })

  it('hides the button from a viewer', async () => {
    currentUserId = 9
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe({ owner: 1, viewers: [9] }))

    render(
      <TooltipProvider>
        <RecipeDetail />
      </TooltipProvider>,
    )

    await waitFor(() => screen.getByText('Base'))
    expect(screen.queryByRole('link', { name: /bearbeiten/i })).toBeNull()
  })
})
