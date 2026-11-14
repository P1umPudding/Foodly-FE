// The editor inside the real shell (#231): status and "Fertig" / "Anlegen" sit in the header, the old footer is gone.
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditorRoute } from '../App'
import { AppShell } from '../components/shell/AppShell'
import { ThemeProvider } from '../theme/ThemeProvider'
import { TimerProvider } from '../timers/TimerProvider'
import { foodly } from '../api'
import { resetPendingSaves } from '../api/pendingSaves'
import type { Recipe } from '../api/protocol'

vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))

vi.mock('../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useMe: () => ({ id: 1, name: 'Kolja', profilePicture: null }),
  useCategories: () => ({ status: 'ready', list: [] }),
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
}))

const recipe: Recipe = {
  id: 5,
  owner: 1,
  editors: [],
  viewers: [],
  createdAt: null,
  updatedAt: null,
  myAccessSince: null,
  rating: [],
  name: 'Pasta',
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
}

function renderAt(path: string) {
  render(
    <ThemeProvider>
      <TooltipProvider>
        <TimerProvider userId={1}>
          <MemoryRouter initialEntries={[path]}>
            <AppShell>
              <Routes>
                <Route path="/recipes/new" element={<RecipeEditorRoute />} />
                <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
              </Routes>
            </AppShell>
          </MemoryRouter>
        </TimerProvider>
      </TooltipProvider>
    </ThemeProvider>,
  )
}

const header = () => within(screen.getByRole('banner'))
const main = () => within(screen.getByRole('main'))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
  resetPendingSaves()
})
afterAll(() => vi.unstubAllEnvs())

describe('RecipeEditor in the shell header', () => {
  it('edit: "Fertig" and the save status are in the header, no footer hint in the page', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe)
    renderAt('/recipes/5/edit')

    await waitFor(() => expect(header().getByRole('button', { name: 'Fertig' })).toBeTruthy())
    expect(header().getByText('Gespeichert')).toBeTruthy()
    expect(header().getByText('Rezept bearbeiten')).toBeTruthy()
    expect(main().queryByRole('button', { name: 'Fertig' })).toBeNull()
    expect(screen.queryByText(/automatisch gesichert/i)).toBeNull()
  })

  it('new: "Anlegen" is in the header, without a save status or a separate "Verwerfen"', () => {
    renderAt('/recipes/new')

    expect(header().getByRole('button', { name: 'Anlegen' })).toBeTruthy()
    expect(header().getByText('Neues Rezept')).toBeTruthy()
    expect(header().queryByText('Gespeichert')).toBeNull()
    expect(screen.queryByText('Verwerfen')).toBeNull()
    // Back is the way to discard.
    expect(header().getByRole('link', { name: 'Zurück' })).toBeTruthy()
  })

  it('nothing in the header while the recipe loads', () => {
    vi.spyOn(foodly, 'getRecipe').mockReturnValue(new Promise(() => {}))
    renderAt('/recipes/5/edit')

    expect(screen.getByTestId('editor-skeleton')).toBeTruthy()
    expect(header().queryByRole('button', { name: 'Fertig' })).toBeNull()
  })
})
