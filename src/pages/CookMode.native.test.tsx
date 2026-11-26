import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CookMode } from './CookMode'
import { foodly } from '../api'
import { BareLayout } from '../components/shell/BareLayout'
import { TimerProvider } from '../timers/TimerProvider'
import type { Recipe } from '../api/protocol'

// The native shell is faked via the `Capacitor` global, so every native adapter the page reaches is mocked: the real
// plugins would otherwise load against a shell without a bridge.
const native = vi.hoisted(() => ({
  keepAwake: vi.fn(() => Promise.resolve()),
  allowSleep: vi.fn(() => Promise.resolve()),
}))
vi.mock('../native/keepAwake', () => native)
vi.mock('../native/timerNotifications', () => ({
  startTimerNotifications: () => () => {},
  isActive: () => true,
  ensureNotificationPermission: () => {},
  onNotificationTap: () => () => {},
  notificationHint: () => Promise.resolve('ok'),
  allowExactNotifications: () => Promise.resolve(),
  onForeground: () => () => {},
}))
vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

const RECIPE: Recipe = {
  id: 5,
  owner: 1,
  editors: [],
  viewers: [],
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
  sections: [{ id: 1, name: null, ingredients: [], steps: ['Zwiebeln hacken', 'Anbraten'] }],
}

beforeEach(() => {
  native.keepAwake.mockClear()
  native.allowSleep.mockClear()
  vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'android' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('CookMode in the native app', () => {
  it('shows the keep-awake switch without the Wake Lock API and lets it be switched off', async () => {
    expect('wakeLock' in navigator).toBe(false)
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(RECIPE)
    render(
      <TooltipProvider>
        <MemoryRouter useTransitions={false} initialEntries={['/recipes/5/cook']}>
          <TimerProvider userId={1}>
            <Routes>
              <Route element={<BareLayout />}>
                <Route path="/recipes/:id/cook" element={<CookMode />} />
              </Route>
            </Routes>
          </TimerProvider>
        </MemoryRouter>
      </TooltipProvider>,
    )
    await screen.findByText('Zwiebeln hacken')

    const toggle = screen.getByRole('button', { name: 'Bildschirm anlassen' })
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(native.keepAwake).toHaveBeenCalledTimes(1)

    fireEvent.click(toggle)

    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(native.allowSleep).toHaveBeenCalledTimes(1)
  })
})
