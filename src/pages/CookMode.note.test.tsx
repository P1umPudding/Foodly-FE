// The private note (#348) is readable in cook mode, but not editable there.
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CookMode } from './CookMode'
import { foodly } from '../api'
import { TimerProvider } from '../timers/TimerProvider'
import type { Recipe } from '../api/protocol'

vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

const RECIPE: Recipe = {
  id: 5,
  owner: 2,
  editors: [],
  viewers: [1],
  createdAt: null,
  updatedAt: null,
  myAccessSince: null,
  name: 'Lasagne',
  tags: [],
  source: null,
  rating: [],
  time: null,
  workMinutes: null,
  overallMinutes: null,
  sizeNumber: 4,
  sizeText: null,
  notes: [],
  mainImage: null,
  images: [],
  sections: [{ id: 1, name: null, ingredients: [], steps: ['Kochen'] }],
}

function renderCook() {
  return render(
    <TooltipProvider>
      <MemoryRouter useTransitions={false} initialEntries={['/recipes/5/cook']}>
        <TimerProvider userId={1}>
          <Routes>
            <Route path="/recipes/:id/cook" element={<CookMode />} />
          </Routes>
        </TimerProvider>
      </MemoryRouter>
    </TooltipProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('CookMode note', () => {
  it('shows my note read-only, also on a recipe I only view', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(RECIPE)
    vi.spyOn(foodly, 'getMyNote').mockResolvedValue('Ofen auf 180 °C')
    renderCook()

    fireEvent.click(await screen.findByRole('button', { name: 'Meine Notiz' }))
    expect(await screen.findByText('Ofen auf 180 °C')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(foodly.getMyNote).toHaveBeenCalledWith(5)
  })

  it('shows no note button without a note', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(RECIPE)
    vi.spyOn(foodly, 'getMyNote').mockResolvedValue('')
    renderCook()

    await screen.findByText('Kochen')
    expect(screen.queryByRole('button', { name: 'Meine Notiz' })).toBeNull()
  })
})
