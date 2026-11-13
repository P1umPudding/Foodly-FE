import { act, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../api'
import { resetSessionEnd } from '../api/auth'
import { RedirectIfSignedIn, RequireAuth } from '../components/shell/RequireAuth'
import { jsonResponse, seedSession } from '../test/auth'
import { startAlarm, stopAlarm } from './alarm'
import { TimerProvider, useTimers } from './TimerProvider'

const toast = vi.hoisted(() =>
  Object.assign(
    vi.fn(() => 'toast-1'),
    { dismiss: vi.fn() },
  ),
)
vi.mock('@postxl/ui-components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@postxl/ui-components')>()),
  toast,
}))
vi.mock('./alarm')
vi.mock('../components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const LEGACY_KEY = 'foodly.timers.v1'
const MIN = 60_000

let api: ReturnType<typeof useTimers>

function TimerList() {
  api = useTimers()
  return (
    <ul aria-label="timers">
      {api.timers.map((t) => (
        <li key={t.id}>
          {t.label} {t.status} {t.remainingMs}
        </li>
      ))}
    </ul>
  )
}

const timerItems = () => screen.getByRole('list', { name: 'timers' }).querySelectorAll('li')

function stored(label: string, fields: Partial<{ status: string; endAt: number | null; remainingMs: number }> = {}) {
  return {
    id: `id-${label}`,
    label,
    durationMs: 10 * MIN,
    status: 'paused',
    endAt: null,
    remainingMs: 5 * MIN,
    ...fields,
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  localStorage.clear()
  resetSessionEnd()
})

describe('TimerProvider storage', () => {
  it('adopts the legacy timers for the first signed-in user and removes the old key', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([stored('Reis')]))
    render(
      <StrictMode>
        <TimerProvider userId={1}>
          <TimerList />
        </TimerProvider>
      </StrictMode>,
    )
    expect(timerItems()[0].textContent).toBe(`Reis paused ${5 * MIN}`)
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(`${LEGACY_KEY}:1`)!)).toEqual([stored('Reis')])
  })

  it('keeps timers already stored for the user and drops the legacy entry', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([stored('Reis')]))
    localStorage.setItem(`${LEGACY_KEY}:1`, JSON.stringify([stored('Nudeln')]))
    render(
      <TimerProvider userId={1}>
        <TimerList />
      </TimerProvider>,
    )
    expect([...timerItems()].map((li) => li.textContent)).toEqual([`Nudeln paused ${5 * MIN}`])
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('without a user loads nothing, writes nothing and leaves the legacy entry alone', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([stored('Reis')]))
    render(
      <TimerProvider userId={null}>
        <TimerList />
      </TimerProvider>,
    )
    act(() => api.add({ label: 'Tee', durationMs: 3 * MIN }))
    expect(timerItems()).toHaveLength(1)
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull()
    expect(Object.keys(localStorage)).toEqual([LEGACY_KEY])
  })

  it('restores a running timer with the time left until endAt', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_000_000)
    localStorage.setItem(
      `${LEGACY_KEY}:1`,
      JSON.stringify([stored('Nudeln', { status: 'running', endAt: 1_000_000 + 7 * MIN, remainingMs: 0 })]),
    )
    render(
      <TimerProvider userId={1}>
        <TimerList />
      </TimerProvider>,
    )
    expect(timerItems()[0].textContent).toBe(`Nudeln running ${7 * MIN}`)
  })

  it('silences a ringing alarm and dismisses its toast on unmount', () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <TimerProvider userId={1}>
        <TimerList />
      </TimerProvider>,
    )
    act(() => api.add({ label: 'Ei', durationMs: 1000 }))
    expect(startAlarm).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(startAlarm).toHaveBeenCalledTimes(1)
    const id = vi.mocked(startAlarm).mock.calls[0][0]
    expect(stopAlarm).not.toHaveBeenCalled()
    unmount()
    expect(stopAlarm).toHaveBeenCalledWith(id)
    expect(toast.dismiss).toHaveBeenCalledWith('toast-1')
  })
})

describe('timers per signed-in user', () => {
  function spyCatalogs() {
    vi.spyOn(foodly, 'me').mockResolvedValue({ id: 1, name: 'Kim', profilePicture: null })
    vi.spyOn(foodly, 'listTags').mockResolvedValue([])
    vi.spyOn(foodly, 'getUsers').mockResolvedValue([])
    vi.spyOn(foodly, 'listIngredients').mockResolvedValue([])
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
  }

  function renderApp() {
    render(
      <MemoryRouter initialEntries={['/recipes']}>
        <Routes>
          <Route element={<RedirectIfSignedIn />}>
            <Route path="/login" element={<p>login</p>} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="*" element={<TimerList />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
  }

  // Like a sign-in in another tab: src/api learns about the stored session from the storage event.
  function signInAs(userId: number) {
    act(() => {
      seedSession({ userId })
      window.dispatchEvent(new StorageEvent('storage', { key: 'foodly.auth' }))
    })
  }

  async function signOut() {
    await act(() => foodly.auth.signOut())
    expect(await screen.findByText('login')).toBeTruthy()
  }

  it("shows each user only their own timers, and the first user's again after switching back", async () => {
    // Only Date is faked: the remaining time after switching back must come from endAt, not from ticks.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_000_000)
    spyCatalogs()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(204))
    signInAs(1)
    renderApp()
    await screen.findByRole('list', { name: 'timers' })
    act(() => api.add({ label: 'Nudeln', durationMs: 10 * MIN }))
    expect(timerItems()[0].textContent).toBe(`Nudeln running ${10 * MIN}`)

    await signOut()
    signInAs(2)
    await screen.findByRole('list', { name: 'timers' })
    expect(timerItems()).toHaveLength(0)

    await signOut()
    vi.setSystemTime(1_000_000 + 3 * MIN)
    signInAs(1)
    await screen.findByRole('list', { name: 'timers' })
    expect(timerItems()[0].textContent).toBe(`Nudeln running ${7 * MIN}`)
  })

  it('stops a ringing alarm on sign-out', async () => {
    spyCatalogs()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(204))
    signInAs(1)
    renderApp()
    await screen.findByRole('list', { name: 'timers' })
    act(() => api.add({ label: 'Ei', durationMs: 50 }))
    await waitFor(() => expect(startAlarm).toHaveBeenCalled(), { timeout: 3000 })
    const id = vi.mocked(startAlarm).mock.calls[0][0]
    await signOut()
    expect(stopAlarm).toHaveBeenCalledWith(id)
    expect(toast.dismiss).toHaveBeenCalledWith('toast-1')
  })

  it('swaps the timers when another user signs in directly, as in another tab', async () => {
    spyCatalogs()
    signInAs(1)
    renderApp()
    await screen.findByRole('list', { name: 'timers' })
    act(() => api.add({ label: 'Ei', durationMs: 50 }))
    await waitFor(() => expect(startAlarm).toHaveBeenCalled(), { timeout: 3000 })
    const id = vi.mocked(startAlarm).mock.calls[0][0]

    signInAs(2)
    await waitFor(() => expect(timerItems()).toHaveLength(0))
    expect(stopAlarm).toHaveBeenCalledWith(id)
    expect(toast.dismiss).toHaveBeenCalledWith('toast-1')
    expect(JSON.parse(localStorage.getItem('foodly.timers.v1:1')!)).toHaveLength(1)
  })
})
