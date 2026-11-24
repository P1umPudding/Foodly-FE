// Detail and cook mode share their ticks (#210, AC3): one router holding both pages.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CookMode } from './CookMode'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import { TimerProvider } from '../timers/TimerProvider'
import type { Recipe } from '../api/protocol'

vi.mock('../components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))
vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
  useUsers: () => [],
}))

function recipe(id: number, name: string): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    rating: [],
    name,
    tags: [],
    source: null,
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: 4,
    sizeText: 'Portionen',
    notes: [],
    mainImage: null,
    images: [],
    sections: [
      {
        id: 1,
        name: null,
        steps: ['Rühren'],
        ingredients: [{ id: 11, ingredient: null, text: 'Mehl', amount: '200', amountPrefix: null, unit: 'g' }],
      },
    ],
  }
}

const RECIPES: Record<number, Recipe> = { 5: recipe(5, 'Pancakes'), 6: recipe(6, 'Waffeln') }

function renderApp() {
  vi.spyOn(foodly, 'getRecipe').mockImplementation(async (id) => RECIPES[id])
  return render(
    <TooltipProvider>
      <TimerProvider userId={1}>
        <MemoryRouter useTransitions={false} initialEntries={['/recipes/5']}>
          <Link to="/recipes/6">test-open-6</Link>
          <Routes>
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/:id/cook" element={<CookMode />} />
          </Routes>
        </MemoryRouter>
      </TimerProvider>
    </TooltipProvider>,
  )
}

const mehl = (scope: HTMLElement = document.body) =>
  within(scope).queryByRole('checkbox', { name: 'Mehl' }) as HTMLInputElement | null

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('ticks across detail and cook mode', () => {
  it('a tick from the detail shows in cook mode, survives ✕ and is gone in another recipe', async () => {
    renderApp()
    await screen.findByRole('heading', { name: 'Pancakes' })
    fireEvent.click(screen.getByRole('button', { name: 'Zutaten abhaken' }))
    fireEvent.click(mehl()!)
    expect(mehl()!.checked).toBe(true)

    fireEvent.click(screen.getByRole('link', { name: 'Kochen' }))
    const column = await screen.findByRole('complementary', { name: 'Zutaten' })
    expect(mehl(column)!.checked).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Koch-Modus beenden' }))
    await screen.findByRole('heading', { name: 'Pancakes' })
    expect(mehl()!.checked).toBe(true)

    fireEvent.click(screen.getByText('test-open-6'))
    await screen.findByRole('heading', { name: 'Waffeln' })
    fireEvent.click(screen.getByRole('button', { name: 'Zutaten abhaken' }))
    expect(mehl()!.checked).toBe(false)
  })

  it('a tick from cook mode is still there in the detail', async () => {
    renderApp()
    await screen.findByRole('heading', { name: 'Pancakes' })
    fireEvent.click(screen.getByRole('link', { name: 'Kochen' }))
    const column = await screen.findByRole('complementary', { name: 'Zutaten' })
    fireEvent.click(mehl(column)!)

    fireEvent.click(screen.getByRole('button', { name: 'Koch-Modus beenden' }))
    await screen.findByRole('heading', { name: 'Pancakes' })
    // Cook mode doesn't switch the detail's check-off mode on; once on, the tick is there.
    fireEvent.click(screen.getByRole('button', { name: 'Zutaten abhaken' }))
    expect(mehl()!.checked).toBe(true)
  })
})
