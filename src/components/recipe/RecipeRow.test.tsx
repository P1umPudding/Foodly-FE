import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { RecipeRow } from './RecipeRow'
import type { StubFeature } from '../../api/stubs'
import type { Recipe } from '../../api/protocol'

// Only the images stub is toggled, so the real showsRecipeImages/recipeImageSrc decide what renders.
const imageStub = vi.hoisted(() => ({ stubbed: true }))
vi.mock('../../api/stubs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/stubs')>()
  return { ...actual, isStubbed: (f: StubFeature) => (f === 'images' ? imageStub.stubbed : actual.isStubbed(f)) }
})

vi.mock('../../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1, useTags: () => ({ byId: {} }) }))

const base: Recipe = {
  id: 1,
  owner: 1,
  editors: [],
  viewers: [2],
  name: 'Shared Dish',
  tags: [],
  source: null,
  rating: [
    { user: 1, rating: 5 },
    { user: 2, rating: 1 },
  ],
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

function renderRow(recipe: Recipe) {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <RecipeRow recipe={recipe} compact={false} />
      </MemoryRouter>
    </TooltipProvider>,
  )
}

it('shared recipe shows the own rating, not the average', () => {
  renderRow(base)
  expect(screen.getByText('5,0')).toBeTruthy() // own, not avg (3,0)
})

it('collaborative recipe shows the average with a decimal comma', () => {
  renderRow({
    ...base,
    editors: [2],
    viewers: [],
    rating: [
      { user: 1, rating: 4 },
      { user: 2, rating: 5 },
    ],
  })
  expect(screen.getByText('4,5')).toBeTruthy()
  expect(screen.queryByText('4.5')).toBeNull()
})

describe('detailed thumbnail', () => {
  it('REST: a recipe with a main image shows the no-photo fallback', () => {
    imageStub.stubbed = true
    const { container } = renderRow({ ...base, mainImage: 3 })
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.lucide-utensils-crossed')).toBeTruthy()
  })

  it('mock: a recipe with a main image shows it', () => {
    imageStub.stubbed = false
    const { container } = renderRow({ ...base, mainImage: 3 })
    expect(container.querySelector('img')?.getAttribute('src')).toMatch(/\/recipes\/3\.svg$/)
    expect(container.querySelector('.lucide-utensils-crossed')).toBeNull()
  })
})
