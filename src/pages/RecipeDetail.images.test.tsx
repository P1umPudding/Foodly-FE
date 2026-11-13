import { fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'
import { ref } from '../test/images'

// The category row has its own tests (RecipeDetail.categories); here it would only need more catalog mocks.
vi.mock('../components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useLocation: () => ({ key: 'default' }),
  useParams: () => ({ id: '5' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
  useUsers: () => [],
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
  mainImage: { id: 3, hash: 'ab12', name: null },
  images: [ref(4), ref(5)],
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

beforeAll(() => {
  // jsdom has no scrollTo; the Lightbox thumbnail strip scrolls on mount.
  Element.prototype.scrollTo ??= vi.fn()
})

afterEach(() => vi.restoreAllMocks())

describe('RecipeDetail images', () => {
  it('REST: serves hero and gallery from the backend by hash', async () => {
    const { container } = renderDetail()

    await screen.findByRole('heading', { name: 'Pancakes' })
    expect(screen.getByText('Warm servieren')).toBeTruthy()
    const srcs = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    // The gallery's first tile repeats the main image (viewer order, as in the mockup).
    expect(srcs).toEqual(['/api/v1/images/ab12', '/api/v1/images/ab12', '/api/v1/images/h4', '/api/v1/images/h5'])
    expect(screen.getByAltText('Pancakes').getAttribute('src')).toBe('/api/v1/images/ab12')
  })

  it('a hero that fails to load shows the placeholder, which still opens the lightbox', async () => {
    renderDetail()

    await screen.findByRole('heading', { name: 'Pancakes' })
    fireEvent.error(screen.getByAltText('Pancakes'))
    const fallback = screen.getByRole('img', { name: 'Pancakes' })
    expect(fallback.className).toContain('aspect-[4/3]')

    fireEvent.click(fallback)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
