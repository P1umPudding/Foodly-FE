import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { RecipeRow } from './RecipeRow'
import type { StubFeature } from '../../api/stubs'
import type { Recipe, UserCategory } from '../../api/protocol'

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

function renderRow(
  recipe: Recipe,
  {
    compact = false,
    showImages,
    categories,
  }: { compact?: boolean; showImages?: boolean; categories?: UserCategory[] } = {},
) {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <RecipeRow recipe={recipe} compact={compact} showImages={showImages} categories={categories} />
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
  expect(document.body.textContent).not.toMatch(/\d\.\d/)
})

describe('detailed thumbnail', () => {
  it('without showImages there is no image cell at all', () => {
    imageStub.stubbed = false
    const { container } = renderRow({ ...base, mainImage: 3 })
    expect(screen.queryByTestId('recipe-thumb')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.lucide-utensils-crossed')).toBeNull()
  })

  it('mock: a recipe with a main image shows it in a 48 px cell', () => {
    imageStub.stubbed = false
    const { container } = renderRow({ ...base, mainImage: 3 }, { showImages: true })
    expect(screen.getByTestId('recipe-thumb').className).toMatch(/\bh-12 w-12\b/)
    expect(container.querySelector('img')?.getAttribute('src')).toMatch(/\/recipes\/3\.svg$/)
    expect(container.querySelector('.lucide-utensils-crossed')).toBeNull()
  })

  it('a recipe without a photo gets the grey placeholder', () => {
    imageStub.stubbed = false
    const { container } = renderRow(base, { showImages: true })
    expect(screen.getByTestId('recipe-thumb').className).toContain('bg-muted')
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.lucide-utensils-crossed')).toBeTruthy()
  })

  it('REST: a main image still falls back to the placeholder', () => {
    imageStub.stubbed = true
    const { container } = renderRow({ ...base, mainImage: 3 }, { showImages: true })
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.lucide-utensils-crossed')).toBeTruthy()
  })
})

describe('category dots and tags', () => {
  const cats: UserCategory[] = [
    { id: 1, user: 1, name: 'Pasta', recipes: [1], order: 0, color: '#cc3333', colorLight: null, colorDark: null },
    { id: 2, user: 1, name: 'Schnell', recipes: [1], order: 1, color: '#3366cc', colorLight: null, colorDark: null },
  ]

  it.each([false, true])('compact=%s shows the dots', (compact) => {
    renderRow(base, { compact, categories: cats })
    expect(screen.getByText('Kategorien: Pasta, Schnell')).toBeTruthy()
    expect(screen.getAllByTestId('category-dot')).toHaveLength(2)
  })

  it('without categories shows no dots', () => {
    renderRow(base)
    expect(screen.queryByTestId('category-dot')).toBeNull()
  })

  it.each([false, true])('compact=%s hides tags on phones', (compact) => {
    const { container } = renderRow({ ...base, tags: ['vegan'] }, { compact })
    expect(container.querySelector('.phone\\:hidden')).toBeTruthy()
  })

  it('no tags → no empty tag wrapper', () => {
    const { container } = renderRow(base, { compact: true })
    expect(container.querySelector('.phone\\:hidden')).toBeNull()
  })
})
