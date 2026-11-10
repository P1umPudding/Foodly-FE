import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'
import { ref } from '../test/images'

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ key: 'default' }),
  useParams: () => ({ id: '5' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
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

afterEach(() => vi.restoreAllMocks())

describe('RecipeDetail images', () => {
  it('REST: serves hero and gallery from the backend by hash', async () => {
    const { container } = renderDetail()

    await screen.findByRole('heading', { name: 'Pancakes' })
    expect(screen.getByText('Warm servieren')).toBeTruthy()
    const srcs = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(srcs).toEqual(['/api/v1/images/ab12', '/api/v1/images/h4', '/api/v1/images/h5'])
    expect(screen.getByAltText('Pancakes').getAttribute('src')).toBe('/api/v1/images/ab12')
  })
})
