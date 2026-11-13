import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { RecipeTile } from './RecipeTile'
import type { Recipe, User, UserCategory } from '../../api/protocol'

const USERS: Record<number, User> = { 2: { id: 2, name: 'Mara', profilePicture: null } }
vi.mock('../../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useUser: (id: number) => USERS[id],
  useTags: () => ({ byId: {} }),
}))

const base: Recipe = {
  id: 1,
  owner: 1,
  editors: [],
  viewers: [],
  name: 'Linsensuppe',
  tags: [],
  source: null,
  rating: [],
  time: '45 min',
  workMinutes: null,
  overallMinutes: null,
  sizeNumber: null,
  sizeText: null,
  notes: [],
  mainImage: null,
  images: [],
  sections: [],
}

const cat = (id: number, name: string): UserCategory => ({
  id,
  user: 1,
  name,
  recipes: [1],
  order: id,
  color: '#3366cc',
  colorLight: null,
  colorDark: null,
})

function renderTile(recipe: Recipe, categories?: UserCategory[]) {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <RecipeTile recipe={recipe} categories={categories} />
      </MemoryRouter>
    </TooltipProvider>,
  )
}

it('links to the recipe detail', () => {
  renderTile(base)
  expect(screen.getByRole('link').getAttribute('href')).toBe('/recipes/1')
})

it('with a photo shows the backend image and the title once', () => {
  const { container } = renderTile({ ...base, mainImage: { id: 1, hash: 'ab12', name: null } })
  expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/v1/images/ab12')
  expect(screen.getAllByText('Linsensuppe')).toHaveLength(1)
  expect(screen.queryByTestId('tile-type-name')).toBeNull()
})

it('a photo that fails to load turns into the typographic tile', () => {
  const { container } = renderTile({ ...base, mainImage: { id: 1, hash: 'ab12', name: null } })
  fireEvent.error(container.querySelector('img')!)
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByTestId('tile-type-name').textContent).toBe('Linsensuppe')
  expect(screen.getAllByText('Linsensuppe')).toHaveLength(1)
})

it('without a photo shows the typographic tile and no second title', () => {
  const { container } = renderTile(base)
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByTestId('tile-type-name').textContent).toBe('Linsensuppe')
  expect(screen.getAllByText('Linsensuppe')).toHaveLength(1)
})

it('names the first category and counts the others', () => {
  renderTile(base, [cat(1, 'Suppen'), cat(2, 'Schnell'), cat(3, 'Vegan')])
  expect(screen.getByTestId('category-line-name').textContent).toBe('Suppen')
  expect(within(screen.getByTestId('category-line')).getByText('+2')).toBeTruthy()
  expect(screen.getAllByTestId('category-dot')).toHaveLength(3)
})

it('has no category line without categories', () => {
  renderTile(base)
  expect(screen.queryByTestId('category-line')).toBeNull()
})

it('shows time and rating with a decimal comma', () => {
  renderTile({ ...base, rating: [{ user: 1, rating: 4 }] })
  expect(screen.getByText('45 min')).toBeTruthy()
  expect(screen.getByText('4,0')).toBeTruthy()
})

describe('"von <Name>"', () => {
  it('names the owner of a foreign recipe when the name is known', () => {
    renderTile({ ...base, owner: 2, viewers: [1] })
    expect(screen.getByText('von Mara')).toBeTruthy()
  })

  it('shows nothing for an owner missing from the catalog', () => {
    renderTile({ ...base, owner: 42, viewers: [1] })
    expect(screen.queryByText(/^von /)).toBeNull()
  })

  it('shows nothing on an own recipe', () => {
    renderTile(base)
    expect(screen.queryByText(/^von /)).toBeNull()
  })
})
