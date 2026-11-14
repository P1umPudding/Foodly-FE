import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter, Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Button, TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import { TimerProvider } from '../timers/TimerProvider'
import type { Recipe } from '../api/protocol'

// The category row has its own tests (RecipeDetail.categories); here it would only need more catalog mocks.
vi.mock('../components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))

vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
  useUsers: () => [],
}))

function recipe(id: number): Recipe {
  return {
    id,
    owner: 2,
    editors: [],
    viewers: [1],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    name: `Rezept ${id}`,
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
}

function ListProbe() {
  const location = useLocation()
  return <div data-testid="list">{`list${location.search}`}</div>
}

function ForwardButton() {
  const navigate = useNavigate()
  return <Button onClick={() => navigate(1)}>test-forward</Button>
}

function routes(): ReactNode {
  return (
    <>
      <Link to="/recipes/5">test-open-5</Link>
      <ForwardButton />
      <Routes>
        <Route path="/recipes" element={<ListProbe />} />
        <Route path="/recipes/:id" element={<RecipeDetail />} />
      </Routes>
    </>
  )
}

function renderMemory(entries: string[]) {
  vi.spyOn(foodly, 'getRecipe').mockImplementation(async (id) => recipe(id))
  render(
    <TooltipProvider>
      <TimerProvider userId={1}>
        <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
          {routes()}
        </MemoryRouter>
      </TimerProvider>
    </TooltipProvider>,
  )
}

function renderBrowser() {
  vi.spyOn(foodly, 'getRecipe').mockImplementation(async (id) => recipe(id))
  render(
    <TooltipProvider>
      <TimerProvider userId={1}>
        <BrowserRouter>{routes()}</BrowserRouter>
      </TimerProvider>
    </TooltipProvider>,
  )
}

const back = () => screen.getByRole('link', { name: /zurück/i })

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('RecipeDetail · Zurück', () => {
  it('goes back in history when coming from the list, keeping the search', async () => {
    renderMemory(['/recipes?q=Pfann', '/recipes/5'])
    await screen.findByText('Rezept 5')

    fireEvent.click(back())

    expect((await screen.findByTestId('list')).textContent).toBe('list?q=Pfann')
    // It was a real Back, not a push: forward returns to the recipe.
    fireEvent.click(screen.getByText('test-forward'))
    expect(await screen.findByText('Rezept 5')).toBeTruthy()
  })

  it('opens the list without search on a direct visit', async () => {
    renderMemory(['/recipes/5'])
    await screen.findByText('Rezept 5')

    fireEvent.click(back())

    expect((await screen.findByTestId('list')).textContent).toBe('list')
    // A push: forward has nowhere to go.
    fireEvent.click(screen.getByText('test-forward'))
    expect(screen.getByTestId('list')).toBeTruthy()
    expect(screen.queryByText('Rezept 5')).toBeNull()
  })

  it('opens the list on a direct visit (browser history)', async () => {
    window.history.replaceState(null, '', '/recipes/5')
    renderBrowser()
    await screen.findByText('Rezept 5')

    fireEvent.click(back())

    expect((await screen.findByTestId('list')).textContent).toBe('list')
    expect(window.location.pathname).toBe('/recipes')
  })

  it('opens the list after a redirect that replaced the first entry (browser history)', async () => {
    // Like the sign-in redirect: the first entry, replaced, so the key is not 'default' but nothing lies before it.
    window.history.replaceState({ usr: null, key: 'redirected', idx: 0 }, '', '/recipes/5')
    renderBrowser()
    await screen.findByText('Rezept 5')

    fireEvent.click(back())

    expect((await screen.findByTestId('list')).textContent).toBe('list')
    expect(window.location.pathname).toBe('/recipes')
  })

  // The stepper replaces the entry (new key, same history index), which must not count as having come from the app.
  it('opens the list on a direct visit after the size was changed (browser history)', async () => {
    window.history.replaceState(null, '', '/recipes/5')
    renderBrowser()
    await screen.findByText('Rezept 5')

    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }))
    expect(window.location.search).toBe('?factor=1.5')
    fireEvent.click(back())

    expect((await screen.findByTestId('list')).textContent).toBe('list')
    expect(window.location.pathname).toBe('/recipes')
  })

  it('goes back in browser history after navigating in the app', async () => {
    window.history.replaceState(null, '', '/recipes?q=Pfann')
    renderBrowser()
    await screen.findByTestId('list')
    fireEvent.click(screen.getByText('test-open-5'))
    await screen.findByText('Rezept 5')

    fireEvent.click(back())

    expect((await screen.findByTestId('list')).textContent).toBe('list?q=Pfann')
    expect(window.location.search).toBe('?q=Pfann')
  })
})
