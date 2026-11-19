import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterAll, afterEach, expect, it, vi } from 'vitest'
import { CatalogProvider } from './CatalogProvider'
import { AppShell } from '../components/shell/AppShell'
import { RecipeDetail } from '../pages/RecipeDetail'
import { ThemeProvider } from '../theme/ThemeProvider'
import { TimerProvider } from '../timers/TimerProvider'
import { foodly } from '../api'
import { jsonResponse, jwt, seedSession } from '../test/auth'
import { setViewport } from '../test/viewport'
import type { Recipe, UserCategory } from '../api/protocol'

// The mode is read when the modules load, so pin REST before the imports run.
vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))
afterAll(() => vi.unstubAllEnvs())

const recipe: Recipe = {
  id: 5,
  owner: 1,
  editors: [],
  viewers: [],
  createdAt: null,
  updatedAt: null,
  myAccessSince: null,
  name: 'Linsensuppe',
  tags: [],
  source: null,
  rating: [],
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

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('updates the sidebar count after deleting a recipe (REST)', async () => {
  setViewport(1280)
  seedSession({ accessToken: jwt(3600) })
  // The backend's state: deleting the recipe drops it from its category.
  let favourites = [5, 6]
  const categoryRequests: string[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/categories?')) {
      categoryRequests.push(url)
      const favouritesCategory: UserCategory = {
        id: 3,
        user: 1,
        name: 'Favoriten',
        recipes: favourites,
        order: 1,
        color: '#e11d48',
        colorLight: null,
        colorDark: null,
      }
      return jsonResponse(200, { data: [favouritesCategory], cursor: null })
    }
    return jsonResponse(404, { message: 'not found' })
  })
  vi.spyOn(foodly, 'me').mockResolvedValue({ id: 1, name: 'Kolja', profilePicture: null })
  vi.spyOn(foodly, 'getUsers').mockResolvedValue([])
  vi.spyOn(foodly, 'listTags').mockResolvedValue([])
  vi.spyOn(foodly, 'listIngredients').mockResolvedValue([])
  vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe)
  vi.spyOn(foodly, 'deleteRecipe').mockImplementation(async () => {
    favourites = [6]
  })

  render(
    <ThemeProvider>
      <TooltipProvider>
        <TimerProvider userId={1}>
          <MemoryRouter initialEntries={['/recipes/5']}>
            <CatalogProvider>
              <AppShell>
                <Routes>
                  <Route path="/recipes" element={<p>list page</p>} />
                  <Route path="/recipes/:id" element={<RecipeDetail />} />
                </Routes>
              </AppShell>
            </CatalogProvider>
          </MemoryRouter>
        </TimerProvider>
      </TooltipProvider>
    </ThemeProvider>,
  )

  const categories = await screen.findByRole('navigation', { name: 'Kategorien' })
  const favouritesCount = async (count: string) =>
    within(await within(categories).findByRole('link', { name: /Favoriten/ })).findByText(count)
  await favouritesCount('2')
  await screen.findByRole('heading', { name: 'Linsensuppe' })

  fireEvent.keyDown(screen.getByRole('button', { name: 'Weitere Aktionen' }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
  const dialog = within(await screen.findByRole('alertdialog'))
  fireEvent.click(dialog.getByRole('button', { name: 'Löschen' }))

  await screen.findByText('list page')
  await favouritesCount('1')
  expect(categoryRequests).toHaveLength(2)
})
