import { StrictMode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from './useAutosave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

// Resolve pending promises without advancing timers.
const flushMicrotasks = () =>
  act(async () => {
    await Promise.resolve()
  })

describe('useAutosave', () => {
  it('does not save the initial value', () => {
    const save = vi.fn().mockResolvedValue(undefined)
    renderHook(() => useAutosave('a', save))

    act(() => vi.advanceTimersByTime(2000))

    expect(save).not.toHaveBeenCalled()
  })

  it('debounces rapid changes into one save', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'ab' })
    act(() => vi.advanceTimersByTime(400))
    rerender({ v: 'abc' })
    act(() => vi.advanceTimersByTime(400))
    rerender({ v: 'abcd' })
    act(() => vi.advanceTimersByTime(800))
    await flushMicrotasks()

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('abcd')
  })

  it('reports saving then saved', async () => {
    let resolve!: () => void
    const save = vi.fn().mockReturnValue(new Promise<void>((r) => (resolve = r)))
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(800))
    expect(result.current.status.state).toBe('saving')

    await act(async () => {
      resolve()
    })
    expect(result.current.status.state).toBe('saved')
    expect(result.current.status.at).not.toBeNull()
  })

  it('coalesces changes made during a flight into one follow-up save', async () => {
    let resolveFirst!: () => void
    const save = vi
      .fn()
      .mockReturnValueOnce(new Promise<void>((r) => (resolveFirst = r)))
      .mockResolvedValue(undefined)
    const { rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(800)) // first save is now in flight

    rerender({ v: 'c' })
    act(() => vi.advanceTimersByTime(800))
    rerender({ v: 'd' })
    act(() => vi.advanceTimersByTime(800))
    expect(save).toHaveBeenCalledTimes(1) // still single-flight

    await act(async () => {
      resolveFirst()
    })
    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith('d') // newest value, not 'c'
  })

  it('exposes an error and retries on the next change', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    expect(result.current.status.state).toBe('error')
    expect(result.current.status.error?.message).toBe('offline')

    rerender({ v: 'c' })
    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    expect(result.current.status.state).toBe('saved')
  })

  it('retries the failed value on demand', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    await act(async () => {
      result.current.retry()
    })

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith('b')
    expect(result.current.status.state).toBe('saved')
  })

  it('flushes a pending save on unmount', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { rerender, unmount } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(200)) // debounce still pending
    unmount()

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('b')
  })

  it('flushes the newest edit on unmount when a save is already in flight', async () => {
    let resolveFirst!: () => void
    const save = vi
      .fn()
      .mockReturnValueOnce(new Promise<void>((r) => (resolveFirst = r)))
      .mockResolvedValue(undefined)
    const { rerender, unmount } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(800)) // save('b') now in flight

    rerender({ v: 'c' }) // schedules a debounce timer that never gets to fire
    unmount() // must not drop 'c' — the in-flight save's finally() should pick it up

    await act(async () => {
      resolveFirst()
    })

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith('c')
  })

  // The best-effort unmount flush must not leak an unhandled rejection when the
  // save fails: the component is gone, so there's no UI left to show the error.
  // `save` is a plain function (not vi.fn) on purpose — Vitest attaches its own
  // handlers to a mock's returned promise to record settledResults, which would
  // mask the very leak we're testing for. We watch process-level
  // `unhandledRejection` directly, since Vitest's own detector only trips when a
  // leak escapes `act`, whereas this flush runs inside the unmount cleanup.
  it('swallows a rejected best-effort save on unmount', async () => {
    vi.useRealTimers() // let the microtask queue drain so a leak would actually fire
    const leaked: unknown[] = []
    const onLeak = (reason: unknown) => leaked.push(reason)
    // `process` isn't in this project's TS `types`, so reach it through globalThis
    // with a narrow local type instead of pulling in @types/node.
    const proc = (
      globalThis as unknown as {
        process: {
          on(event: 'unhandledRejection', listener: (reason: unknown) => void): void
          off(event: 'unhandledRejection', listener: (reason: unknown) => void): void
        }
      }
    ).process
    proc.on('unhandledRejection', onLeak)
    try {
      const calls: string[] = []
      const save = (v: string) => {
        calls.push(v)
        return Promise.reject(new Error('offline'))
      }
      const { rerender, unmount } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

      rerender({ v: 'b' })
      await new Promise((r) => setTimeout(r, 200)) // debounce still pending, draft is dirty
      unmount() // fires the best-effort flush against the rejecting save

      await new Promise((r) => setTimeout(r, 0)) // drain microtasks; a leak surfaces here

      expect(calls).toEqual(['b']) // flush ran with the newest value
      expect(leaked).toHaveLength(0) // and its rejection was swallowed, not leaked
    } finally {
      proc.off('unhandledRejection', onLeak)
    }
  })

  // The component that could show `status` is gone by the time this rejects, so
  // the hook must hand the error to onFlushError instead of dropping it.
  it('reports a rejected unmount-flush save via onFlushError', async () => {
    const onFlushError = vi.fn()
    // Plain rejecting function, not vi.fn().mockRejectedValue — see the swallow
    // test above for why a mock here would mask the very thing under test.
    const save = (v: string) => Promise.reject(new Error(`offline: ${v}`))
    const { rerender, unmount } = renderHook(({ v }) => useAutosave(v, save, { onFlushError }), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(200)) // debounce still pending, draft is dirty
    unmount() // fires the best-effort flush against the rejecting save

    await flushMicrotasks()

    expect(onFlushError).toHaveBeenCalledTimes(1)
    expect(onFlushError).toHaveBeenCalledWith(new Error('offline: b'))
  })

  // StrictMode dev double-invoke runs the unmount-flush effect setup->cleanup->setup
  // on first mount, so its cleanup would leave the mounted ref false even though the
  // component is very much still there. A real (mounted) save failure must still land
  // as status='error' for the UI to show retry — not get shunted to onFlushError.
  it('routes a mounted save failure to error status under StrictMode', async () => {
    const onFlushError = vi.fn()
    // Plain rejecting function, not vi.fn().mockRejectedValue — a mock's returned
    // promise gets Vitest handlers attached that mask the rejection under test.
    const save = (v: string) => Promise.reject(new Error(`offline: ${v}`))
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, save, { onFlushError }), {
      initialProps: { v: 'a' },
      wrapper: StrictMode,
    })

    rerender({ v: 'b' })
    await act(async () => {
      vi.advanceTimersByTime(800)
    })
    await flushMicrotasks()

    expect(result.current.status.state).toBe('error')
    expect(onFlushError).not.toHaveBeenCalled()
  })

  it('saves nothing while disabled', () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(({ v }) => useAutosave(v, save, { enabled: false }), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(2000))

    expect(save).not.toHaveBeenCalled()
  })

  // The editor's value goes null -> loaded-recipe while the fetch resolves. That
  // must NOT count as an edit, or opening a recipe would immediately re-save it.
  it('adopts the value present when it becomes enabled', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(({ v, enabled }) => useAutosave(v, save, { enabled }), {
      initialProps: { v: null as string | null, enabled: false },
    })

    rerender({ v: 'loaded', enabled: true })
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(save).not.toHaveBeenCalled()

    rerender({ v: 'loaded, then edited', enabled: true })
    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('loaded, then edited')
  })
})
