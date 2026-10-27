import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditorRoute } from '../App'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

// Real react-router here (unlike RecipeEditor.test.tsx) so the key-based remount
// on route change is actually exercised — a mocked router can't reproduce the
// shared-fiber bug this guards against.

vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    rating: [],
    name: 'Pasta 5',
    tags: [],
    source: null,
    time: '20 min',
    workMinutes: 20,
    overallMinutes: 40,
    sizeNumber: 4,
    sizeText: '{Portionen}',
    notes: [],
    mainImage: null,
    images: [],
    sections: [{ id: 1, name: null, ingredients: [], steps: ['Kochen.'] }],
    ...over,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RecipeEditorRoute · remount on route change', () => {
  it('resets to a blank new-recipe form when navigating edit -> new', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'createRecipe').mockResolvedValue(recipe())

    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/recipes/5/edit']}>
          <Link to="/recipes/new">go new</Link>
          <Routes>
            <Route path="/recipes/new" element={<RecipeEditorRoute />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    )

    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Pasta 5'))

    fireEvent.click(screen.getByText('go new'))

    // Without the remount key the stale draft (recipe 5) would linger, and
    // autosave would PUT updateRecipe(5, ...) while the header says "Neues Rezept".
    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe(''))
    expect(screen.getByRole('button', { name: 'Anlegen' })).toBeTruthy()
  })
})
