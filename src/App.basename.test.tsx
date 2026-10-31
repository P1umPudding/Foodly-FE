import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { foodly } from './api'
import type { StubFeature } from './api/stubs'
import { useRequest } from './hooks/useRequest'
import type { Recipe } from './api/protocol'

// The Skaile preview serves the app under a sub-path: main.tsx sets the router
// basename to BASE_URL. This checks that links and public-asset images pick up
// that prefix. SKAILE_PREVIEW_BASE -> base -> BASE_URL is not covered here; it
// was checked by hand with a preview build and the running Skaile preview.

// Mock mode keeps the detail image, so its src can show the base-path prefix; REST shows none.
const imageStub = vi.hoisted(() => ({ stubbed: false }))
vi.mock('./api/stubs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/stubs')>()
  return { ...actual, isStubbed: (f: StubFeature) => (f === 'images' ? imageStub.stubbed : actual.isStubbed(f)) }
})

vi.mock('./catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
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
  mainImage: 3,
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
  it('deep-links to the detail page with prefixed image and back link', async () => {
    imageStub.stubbed = false
    const { container } = renderAt('/foo/recipes/1')

    await screen.findByRole('heading', { name: 'Pancakes' })
    const imgSrcs = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(imgSrcs).toContain('/foo/recipes/3.svg')
    expect(screen.getByRole('link', { name: '← Zurück' }).getAttribute('href')).toBe('/foo/recipes')
  })

  it('REST: deep-links to the detail page without an image', async () => {
    imageStub.stubbed = true
    const { container } = renderAt('/foo/recipes/1')

    await screen.findByRole('heading', { name: 'Pancakes' })
    expect(container.querySelector('img[src*="/recipes/"]')).toBeNull()
    expect(screen.getByRole('link', { name: '← Zurück' }).getAttribute('href')).toBe('/foo/recipes')
  })

  // group=0: categories=[] makes the recipe uncategorised, and that group
  // starts collapsed (see RecipeList.search.test.tsx).
  it('links list rows to the prefixed detail URL', async () => {
    imageStub.stubbed = false
    renderAt('/foo/recipes?group=0')

    await screen.findByText('Pancakes')
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/foo/recipes/1')
  })
})
