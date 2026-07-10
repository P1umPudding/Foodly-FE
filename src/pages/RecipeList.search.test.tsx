import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, it, vi } from 'vitest'
import { RecipeList } from './RecipeList'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

function rec(id: number, name: string): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
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

// The catalog context the page reads from.
vi.mock('../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
}))

afterEach(() => vi.restoreAllMocks())

describe('RecipeList (server-side search)', () => {
  it('renders recipes returned by searchRecipes', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    render(
      // categories=[] makes every recipe "uncategorised", and that group starts
      // collapsed by default (see RecipeList's `loadCollapsed(...) ?? ['uncat']`),
      // which would unmount its rows entirely. Force the flat (ungrouped) view via
      // the URL so the test asserts on rendered content, not on collapse defaults.
      <MemoryRouter initialEntries={['/?group=0']}>
        <TooltipProvider>
          <RecipeList />
        </TooltipProvider>
      </MemoryRouter>,
    )

    // No @testing-library/jest-dom in this project (toBeInTheDocument isn't
    // available) — getByText already throws until found, so plain waitFor
    // retries until the element exists (see CatalogProvider.test.tsx for the
    // same idiom).
    await waitFor(() => screen.getByText('Pancakes'))
  })
})
