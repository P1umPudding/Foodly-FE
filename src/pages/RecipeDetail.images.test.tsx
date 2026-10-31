import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { StubFeature } from '../api/stubs'
import type { Recipe } from '../api/protocol'

// Only the images stub is toggled, so the real showsRecipeImages/recipeImageSrc decide what renders.
const imageStub = vi.hoisted(() => ({ stubbed: true }))
vi.mock('../api/stubs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/stubs')>()
  return { ...actual, isStubbed: (f: StubFeature) => (f === 'images' ? imageStub.stubbed : actual.isStubbed(f)) }
})

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '5' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

const recipe: Recipe = {
  id: 5,
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
  notes: ['Warm servieren'],
  mainImage: 3,
  images: [4, 5],
  sections: [],
}

function renderDetail() {
  vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe)
  return render(
    <TooltipProvider>
      <RecipeDetail />
    </TooltipProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('RecipeDetail images', () => {
  it('REST: a recipe with images looks like one without photos', async () => {
    imageStub.stubbed = true
    const { container } = renderDetail()

    await screen.findByRole('heading', { name: 'Pancakes' })
    expect(screen.getByText('Warm servieren')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.cursor-zoom-in')).toBeNull()
  })

  it('mock: shows the recipe images', async () => {
    imageStub.stubbed = false
    const { container } = renderDetail()

    await screen.findByRole('heading', { name: 'Pancakes' })
    const srcs = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(srcs.some((src) => src?.endsWith('/recipes/3.svg'))).toBe(true)
  })
})
