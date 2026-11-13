import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { RecipeRow } from './RecipeRow'
import type { Recipe, Tag, UserCategory } from '../../api/protocol'
import { ref } from '../../test/images'

const tags = vi.hoisted(() => ({ byId: {} as Record<string, Tag> }))
vi.mock('../../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1, useTags: () => tags }))

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
    const { container } = renderRow({ ...base, mainImage: ref(3) })
    expect(screen.queryByTestId('recipe-thumb')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.lucide-utensils-crossed')).toBeNull()
  })

  it('REST: a recipe with a main image shows it from the backend in a 48 px cell', () => {
    const { container } = renderRow({ ...base, mainImage: { id: 3, hash: 'ab12', name: null } }, { showImages: true })
    expect(screen.getByTestId('recipe-thumb').className).toMatch(/\bh-12 w-12\b/)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/v1/images/ab12')
    expect(container.querySelector('.lucide-utensils-crossed')).toBeNull()
  })

  it('a photo that fails to load looks like no photo', () => {
    const { container } = renderRow({ ...base, mainImage: ref(3) }, { showImages: true })
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.lucide-utensils-crossed')).toBeTruthy()
  })

  it('a recipe without a photo gets the grey placeholder', () => {
    const { container } = renderRow(base, { showImages: true })
    expect(screen.getByTestId('recipe-thumb').className).toContain('bg-muted')
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

  it.each([false, true])('compact=%s shows at most two tags as chips', (compact) => {
    renderRow({ ...base, tags: ['Vegan', 'Scharf', 'Schnell'] }, { compact })
    expect(screen.getByText('Vegan').parentElement!.className).toContain('bg-tag')
    expect(screen.getByText('Scharf').parentElement!.className).toContain('bg-tag')
    expect(screen.queryByText('Schnell')).toBeNull()
  })

  it('no tags → no empty tag wrapper', () => {
    const { container } = renderRow(base, { compact: true })
    expect(container.querySelector('.phone\\:hidden')).toBeNull()
  })
})

describe('RecipeRow · compact name tooltip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    tags.byId = {}
  })

  it('shows tag names without braces when the name is truncated', async () => {
    tags.byId = { Vegan: { id: 'Vegan', svg: null } }
    // jsdom has no layout: fake an overflowing name so the tooltip attaches.
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(300)
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(100)
    renderRow({ ...base, name: 'Spaghetti {Vegan} Bolognese' }, { compact: true })

    fireEvent.focus(screen.getByText('Spaghetti Vegan Bolognese'))
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip.textContent).toBe('Spaghetti Vegan Bolognese')
  })
})
