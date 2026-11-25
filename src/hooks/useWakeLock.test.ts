import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from './useWakeLock'

const native = vi.hoisted(() => ({
  keepAwake: vi.fn(() => Promise.resolve()),
  allowSleep: vi.fn(() => Promise.resolve()),
}))
vi.mock('../native/keepAwake', () => native)

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

  it('releases the earlier of two overlapping requests', async () => {
    const { unmount } = renderHook(() => useWakeLock(true))
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(request).toHaveBeenCalledTimes(2)

    const first = sentinel()
    const second = sentinel()
    await resolveNext(first)
    await resolveNext(second)

    expect(first.release).toHaveBeenCalledTimes(1)
    expect(second.release).not.toHaveBeenCalled()
    unmount()
    expect(second.release).toHaveBeenCalledTimes(1)
  })
})

describe('useWakeLock (native)', () => {
  beforeEach(() => {
    // The native shell has no Wake Lock API; the hook must not depend on it.
    Reflect.deleteProperty(navigator, 'wakeLock')
    native.keepAwake.mockClear().mockImplementation(() => Promise.resolve())
    native.allowSleep.mockClear().mockImplementation(() => Promise.resolve())
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'android' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is supported without navigator.wakeLock', () => {
    const { result } = renderHook(() => useWakeLock())
    expect(result.current.supported).toBe(true)
    expect(native.keepAwake).not.toHaveBeenCalled()
  })

  it('keeps the screen awake when switched on and allows sleep when switched off', () => {
    const { result } = renderHook(() => useWakeLock(true))
    expect(native.keepAwake).toHaveBeenCalledTimes(1)
    expect(native.allowSleep).not.toHaveBeenCalled()

    act(() => result.current.setEnabled(false))

    expect(native.allowSleep).toHaveBeenCalledTimes(1)
    expect(native.keepAwake).toHaveBeenCalledTimes(1)
  })

  it('allows sleep on unmount', () => {
    const { unmount } = renderHook(() => useWakeLock(true))
    unmount()
    expect(native.allowSleep).toHaveBeenCalledTimes(1)
  })

  it('switches off when the plugin fails', async () => {
    native.keepAwake.mockImplementationOnce(() => Promise.reject(new Error('nope')))
    const { result } = renderHook(() => useWakeLock(true))

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.enabled).toBe(false)
  })

  it('does not re-acquire on visibility changes', () => {
    renderHook(() => useWakeLock(true))
    visibility = 'hidden'
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    visibility = 'visible'
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(native.keepAwake).toHaveBeenCalledTimes(1)
    expect(request).not.toHaveBeenCalled()
  })
})
