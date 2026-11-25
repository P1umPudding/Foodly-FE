import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import { TimerProvider } from '../timers/TimerProvider'
import type { Recipe } from '../api/protocol'

const openExternal = vi.hoisted(() => vi.fn())
vi.mock('../native/openExternal', () => ({ openExternal }))
// With the faked native shell these would load the real plugins against a shell without a bridge.
vi.mock('../native/keepAwake', () => ({ keepAwake: () => Promise.resolve(), allowSleep: () => Promise.resolve() }))
vi.mock('../native/timerNotifications', () => ({
  startTimerNotifications: () => () => {},
  isActive: () => true,
  ensureNotificationPermission: () => {},
  onNotificationTap: () => () => {},
}))
vi.mock('../components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))
vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
  useUsers: () => [],
}))

const SOURCE = 'https://example.com/x'

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    rating: [],
    name: 'Pancakes',
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
    sections: [{ id: 1, name: null, steps: ['Rühren'], ingredients: [] }],
    ...over,
  }
}

async function sourceLink() {
  vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe({ source: SOURCE }))
  render(
    <TooltipProvider>
      <TimerProvider userId={1}>
        <MemoryRouter useTransitions={false} initialEntries={['/recipes/5']}>
          <Routes>
            <Route path="/recipes/:id" element={<RecipeDetail />} />
          </Routes>
        </MemoryRouter>
      </TimerProvider>
    </TooltipProvider>,
  )
  return screen.findByRole('link', { name: SOURCE })
}

beforeEach(() => {
  openExternal.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('RecipeDetail source link', () => {
  it('opens in the in-app browser in the native app instead of navigating', async () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'android' })
    const link = await sourceLink()

    const notPrevented = fireEvent.click(link)

    expect(notPrevented).toBe(false)
    expect(openExternal).toHaveBeenCalledWith(SOURCE)
  })

  it('stays a plain new-tab link on the web', async () => {
    const link = await sourceLink()
    expect(link.getAttribute('target')).toBe('_blank')
    let preventedByApp: boolean | null = null
    // jsdom can't navigate; stop it after recording what the app did.
    const stop = (e: Event) => {
      preventedByApp = e.defaultPrevented
      e.preventDefault()
    }
    document.addEventListener('click', stop)

    fireEvent.click(link)

    document.removeEventListener('click', stop)
    expect(preventedByApp).toBe(false)
    expect(openExternal).not.toHaveBeenCalled()
  })
})
