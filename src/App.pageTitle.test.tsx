import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditorRoute } from './App'
import { AppShell } from './components/shell/AppShell'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { ThemeProvider } from './theme/ThemeProvider'
import { TimerProvider } from './timers/TimerProvider'
import { foodly } from './api'
import { useRequest } from './hooks/useRequest'
import { setViewport } from './test/viewport'
import type { Recipe } from './api/protocol'

// Shell and page together: the header shows the title, the page owns the one h1. jsdom applies no CSS, so
// "visible once" means: once in the header, and in the page only as the sr-only h1. The sidebar's nav
// links carry the same words, but they are links, not titles, so the checks stay inside header and main.

vi.mock('./catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useMe: () => ({ id: 1, name: 'Kolja', profilePicture: null }),
  useUser: () => undefined,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
  useCategories: () => {
    const req = useRequest(() => foodly.listCategories(), [])
    return { list: req.data ?? [], status: req.status }
  },
}))

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    name: 'Pancakes',
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
    ...over,
  }
}

const never = () => new Promise<never>(() => {})

// Flushes the sidebar's category request, so nothing updates after the assertions.
async function renderAt(entry: string) {
  render(
    <ThemeProvider>
      <TooltipProvider>
        <TimerProvider>
          <MemoryRouter initialEntries={[entry]}>
            <AppShell>
              <Routes>
                <Route path="/recipes" element={<RecipeList />} />
                <Route path="/recipes/new" element={<RecipeEditorRoute />} />
                <Route path="/recipes/:id" element={<RecipeDetail />} />
                <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
              </Routes>
            </AppShell>
          </MemoryRouter>
        </TimerProvider>
      </TooltipProvider>
    </ThemeProvider>,
  )
  await act(async () => {})
}

const h1s = () => screen.getAllByRole('heading', { level: 1 })

function expectTitleOnce(title: string) {
  expect(within(screen.getByRole('banner')).getAllByText(title)).toHaveLength(1)
  const inPage = within(screen.getByRole('main')).getAllByText(title)
  expect(inPage).toHaveLength(1)
  expect(inPage[0].tagName).toBe('H1')
  expect(inPage[0].className).toContain('sr-only')
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
  vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [recipe()], cursor: null })
  vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
  vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
  vi.spyOn(foodly, 'createRecipe').mockResolvedValue(recipe())
})

afterEach(() => {
  vi.restoreAllMocks()
  setViewport(1024)
})

describe('page title shown once', () => {
  it('list: title only in the header', async () => {
    await renderAt('/recipes?group=0')
    await screen.findByText('Pancakes')
    expectTitleOnce('Rezepte')
    expect(h1s()).toHaveLength(1)
  })

  it('new recipe: title only in the header', async () => {
    await renderAt('/recipes/new')
    expectTitleOnce('Neues Rezept')
    expect(h1s()).toHaveLength(1)
  })

  it('edit recipe: title only in the header', async () => {
    await renderAt('/recipes/5/edit')
    await screen.findByDisplayValue('Pancakes')
    expectTitleOnce('Rezept bearbeiten')
    expect(h1s()).toHaveLength(1)
  })
})

describe('exactly one h1', () => {
  it('list while loading', async () => {
    vi.mocked(foodly.searchRecipes).mockImplementation(never)
    await renderAt('/recipes?group=0')
    expect(h1s()).toHaveLength(1)
  })

  it('list on error', async () => {
    vi.mocked(foodly.searchRecipes).mockRejectedValue(new Error('Server weg'))
    await renderAt('/recipes?group=0')
    await screen.findByText('Server weg')
    expect(h1s()).toHaveLength(1)
  })

  it('editor while loading', async () => {
    vi.mocked(foodly.getRecipe).mockImplementation(never)
    await renderAt('/recipes/5/edit')
    expect(screen.getByRole('heading', { level: 1, name: 'Rezept bearbeiten' })).toBeTruthy()
    expect(h1s()).toHaveLength(1)
  })

  it('editor on error', async () => {
    vi.mocked(foodly.getRecipe).mockRejectedValue(new Error('nicht da'))
    await renderAt('/recipes/5/edit')
    await screen.findByText('Rezept nicht gefunden')
    expect(h1s()).toHaveLength(1)
  })

  it('editor without edit rights', async () => {
    vi.mocked(foodly.getRecipe).mockResolvedValue(recipe({ owner: 2, viewers: [1] }))
    await renderAt('/recipes/5/edit')
    await screen.findByText('Kein Zugriff')
    expect(h1s()).toHaveLength(1)
  })

  it('detail keeps the recipe name as its h1', async () => {
    await renderAt('/recipes/5')
    await screen.findByRole('heading', { level: 1, name: 'Pancakes' })
    expect(h1s()).toHaveLength(1)
  })
})
