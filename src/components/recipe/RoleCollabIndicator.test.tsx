import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { RoleCollabIndicator } from './RoleCollabIndicator'
import type { Recipe } from '../../api/protocol'

vi.mock('../../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1 }))

const base: Recipe = {
  id: 1,
  owner: 1,
  editors: [],
  viewers: [],
  name: 'R',
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

it('labels owner + private', () => {
  render(
    <TooltipProvider>
      <RoleCollabIndicator recipe={{ ...base, owner: 1 }} />
    </TooltipProvider>,
  )
  expect(screen.getByLabelText(/Besitzer/i)).toBeTruthy()
  expect(screen.getByLabelText(/privat/i)).toBeTruthy()
})

it('labels viewer + collaborative', () => {
  render(
    <TooltipProvider>
      <RoleCollabIndicator recipe={{ ...base, owner: 2, editors: [3], viewers: [1] }} />
    </TooltipProvider>,
  )
  expect(screen.getByLabelText(/Betrachter/i)).toBeTruthy()
  expect(screen.getByLabelText(/kollaborativ/i)).toBeTruthy()
})
