import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from './useWakeLock'

type FakeSentinel = { release: ReturnType<typeof vi.fn> }

// Each request() stays pending until the test resolves it, so the order of cleanup and resolution is controlled.
let pending: Array<(sentinel: FakeSentinel) => void> = []
const request = vi.fn(() => new Promise<FakeSentinel>((resolve) => pending.push(resolve)))
const sentinel = (): FakeSentinel => ({ release: vi.fn(() => Promise.resolve()) })
let visibility: DocumentVisibilityState = 'visible'

async function resolveNext(s: FakeSentinel) {
  await act(async () => {
    pending.shift()?.(s)
    await Promise.resolve()
  })
}

beforeEach(() => {
  pending = []
  request.mockClear()
  visibility = 'visible'
  // Installed before renderHook: the hook reads `'wakeLock' in navigator` while rendering.
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
})

afterEach(() => {
  // Drop the overrides again; the jsdom originals live on the prototypes.
  Reflect.deleteProperty(navigator, 'wakeLock')
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('useWakeLock', () => {
  it('releases the lock when switched off', async () => {
    const { result } = renderHook(() => useWakeLock(true))
    const s = sentinel()
    await resolveNext(s)

    act(() => result.current.setEnabled(false))

    expect(s.release).toHaveBeenCalledTimes(1)
  })

  it('releases a lock that arrives after it was switched off', async () => {
    const { result } = renderHook(() => useWakeLock(true))
    expect(request).toHaveBeenCalledTimes(1)

    act(() => result.current.setEnabled(false))
    const s = sentinel()
    await resolveNext(s)

    expect(s.release).toHaveBeenCalledTimes(1)
  })

  it('releases a lock that arrives after the page was left', async () => {
    const { unmount } = renderHook(() => useWakeLock(true))

    unmount()
    const s = sentinel()
    await resolveNext(s)

    expect(s.release).toHaveBeenCalledTimes(1)
  })

  it('releases the old lock when it is re-acquired on return to the tab', async () => {
    const { unmount } = renderHook(() => useWakeLock(true))
    const first = sentinel()
    await resolveNext(first)

    visibility = 'hidden'
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    visibility = 'visible'
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(request).toHaveBeenCalledTimes(2)
    const second = sentinel()
    await resolveNext(second)

    expect(first.release).toHaveBeenCalledTimes(1)
    expect(second.release).not.toHaveBeenCalled()
    unmount()
    expect(second.release).toHaveBeenCalledTimes(1)
  })
})
