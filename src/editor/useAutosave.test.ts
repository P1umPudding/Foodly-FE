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
