import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { foodly } from './api'
import type { Recipe } from './api/protocol'

// The Skaile preview serves the app under a sub-path: main.tsx sets the router
// basename to BASE_URL. This checks that links and public-asset images pick up
// that prefix. The env -> base wiring itself is covered by the build.

vi.mock('./catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
}))

// mainImage 3 isn't in assets.ts's module-load-time image map, so its URL is
// built at call time from the stubbed BASE_URL.
const recipe: Recipe = {
  id: 1,
  owner: 1,
  editors: [],
  viewers: [],
  name: 'Pancakes',
  tags: [],
  source: null,
  rating: [],
  time: null,
  workMinutes: null,
  overallMinutes: null,
  sizeNumber: null,
  sizeText: null,
  notes: [],
  mainImage: 3,
  images: [],
  sections: [],
}

function renderAt(entry: string) {
  return render(
    <TooltipProvider>
      <MemoryRouter basename="/foo/" initialEntries={[entry]}>
        <Routes>
          <Route path="/" element={<RecipeList />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  )
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/foo/')
  vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [recipe], cursor: null })
  vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
  vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('routing under a sub-path basename', () => {
  it('deep-links to the detail page with prefixed image and back link', async () => {
    const { container } = renderAt('/foo/recipes/1')

    await waitFor(() => screen.getByRole('heading', { name: 'Pancakes' }))
    const imgSrcs = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(imgSrcs).toContain('/foo/recipes/3.svg')
    expect(screen.getByRole('link', { name: '← Zurück' }).getAttribute('href')).toBe('/foo/')
  })

  // group=0: categories=[] makes the recipe uncategorised, and that group
  // starts collapsed (see RecipeList.search.test.tsx).
  it('links list rows to the prefixed detail URL', async () => {
    renderAt('/foo/?group=0')

    await waitFor(() => screen.getByText('Pancakes'))
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/foo/recipes/1')
  })
})
