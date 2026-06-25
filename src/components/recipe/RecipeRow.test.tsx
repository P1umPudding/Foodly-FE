import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { RecipeRow } from './RecipeRow'
import type { Recipe } from '../../api/protocol'

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
  amount: null,
  basePortionMultiplier: null,
  notes: [],
  mainImage: null,
  images: [],
  sections: [],
}

it('shared recipe shows the own rating, not the average', () => {
  render(
    <TooltipProvider>
      <MemoryRouter>
        <RecipeRow recipe={base} />
      </MemoryRouter>
    </TooltipProvider>,
  )
  expect(screen.getByText('5.0')).toBeTruthy() // own, not avg (3.0)
})
