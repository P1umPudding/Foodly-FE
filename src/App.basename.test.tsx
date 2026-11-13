import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { foodly } from './api'
import { useRequest } from './hooks/useRequest'
import type { Recipe } from './api/protocol'
import { ref } from './test/images'

// The category row has its own tests (RecipeDetail.categories); here it would only need more catalog mocks.
vi.mock('./components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))

// The Skaile preview serves the app under a sub-path: main.tsx sets the router
// basename to BASE_URL. This checks that links and public-asset images pick up
// that prefix. SKAILE_PREVIEW_BASE -> base -> BASE_URL is not covered here; it
// was checked by hand with a preview build and the running Skaile preview.

vi.mock('./catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
  useCurrentUserId: () => 1,
  useUser: () => undefined,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
  // Goes through the real foodly.listCategories, so each test's spy decides the categories.
  useCategories: () => {
    const req = useRequest(() => foodly.listCategories(), [])
    return { list: req.data ?? [], status: req.status }
  },
}))

// Image URLs must be built at call time from the stubbed BASE_URL: id 3 must stay
// out of assets.ts's DEV_RECIPE_IMAGE, which captures BASE_URL at module load.
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
  mainImage: ref(3),
  images: [],
  sections: [],
}

function renderAt(entry: string) {
  return render(
    <TooltipProvider>
      <MemoryRouter basename="/foo/" initialEntries={[entry]}>
        <Routes>
          <Route path="/recipes" element={<RecipeList />} />
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
  // Backend images come from VITE_API_URL, not from the app's basename; the mock-mode basename case is in assets.test.ts.
  it('deep-links to the detail page with the backend image and a prefixed back link', async () => {
    const { container } = renderAt('/foo/recipes/1')

    await screen.findByRole('heading', { name: 'Pancakes' })
    const imgSrcs = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(imgSrcs).toContain('/api/v1/images/h3')
    expect(screen.getByRole('link', { name: '← Zurück' }).getAttribute('href')).toBe('/foo/recipes')
  })

  // group=0: categories=[] makes the recipe uncategorised, and that group
  // starts collapsed (see RecipeList.search.test.tsx).
  it('links list rows to the prefixed detail URL', async () => {
    renderAt('/foo/recipes?group=0')

    await screen.findByText('Pancakes')
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/foo/recipes/1')
  })
})
