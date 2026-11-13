// REST mode (VITE_MOCK is unset in tests): the owner's name comes from getUsers through the real catalog.
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, expect, it, vi } from 'vitest'
import { foodly } from '../../api'
import { CatalogProvider } from '../../catalog/CatalogProvider'
import { RecipeTile } from './RecipeTile'
import type { Recipe } from '../../api/protocol'

afterEach(() => {
  vi.restoreAllMocks()
})

const recipe: Recipe = {
  id: 1,
  owner: 2,
  editors: [],
  viewers: [1],
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

it('names the owner of a foreign recipe from the backend answer', async () => {
  vi.spyOn(foodly, 'me').mockResolvedValue({ id: 1, name: 'Kolja', profilePicture: null })
  vi.spyOn(foodly, 'listTags').mockResolvedValue([])
  vi.spyOn(foodly, 'listIngredients').mockResolvedValue([])
  vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
  const getUsers = vi.spyOn(foodly, 'getUsers').mockResolvedValue([{ id: 2, name: 'Mara', profilePicture: null }])

  render(
    <TooltipProvider>
      <MemoryRouter>
        <CatalogProvider>
          <RecipeTile recipe={recipe} />
        </CatalogProvider>
      </MemoryRouter>
    </TooltipProvider>,
  )

  await screen.findByText('von Mara')
  await waitFor(() => expect(getUsers).toHaveBeenCalledWith([2]))
})
