import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RecipeListView } from './RecipeListView'
import type { Recipe, UserCategory } from '../../api/protocol'

vi.mock('../../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1, useTags: () => ({ byId: {} }) }))

const base: Recipe = {
  id: 0,
  owner: 1,
  editors: [],
  viewers: [],
  name: '',
  tags: [],
  source: null,
  rating: [],
  time: null,
  workMinutes: null,
  overallMinutes: null,
  amount: null,
  basePortionMultiplier: null,
  notes: [],
  mainImage: null,
  images: [],
  sections: [],
}
const recipes: Recipe[] = [
  { ...base, id: 1, name: 'In Both' },
  { ...base, id: 2, name: 'Loner' },
]
const cats: UserCategory[] = [
  { id: 10, user: 1, name: 'Fav', recipes: [1], order: 0, color: '#000', colorLight: null, colorDark: null },
  { id: 11, user: 1, name: 'Quick', recipes: [1], order: 1, color: '#000', colorLight: null, colorDark: null },
]

it('by-category shows a recipe under each of its categories + Ohne Kategorie bucket', () => {
  render(
    <MemoryRouter>
      <RecipeListView recipes={recipes} categories={cats} group="by-category" detail="detailed" />
    </MemoryRouter>,
  )
  expect(screen.getByText('Fav')).toBeTruthy()
  expect(screen.getByText('Quick')).toBeTruthy()
  expect(screen.getByText('Ohne Kategorie')).toBeTruthy()
  expect(screen.getAllByText('In Both').length).toBe(2) // appears in both categories
  expect(screen.getAllByText('Loner').length).toBe(1) // only in the bucket
})
