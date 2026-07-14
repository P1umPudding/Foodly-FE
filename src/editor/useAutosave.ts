// Debounced background save with a single request in flight.
//
// Why single-flight + coalescing rather than one request per change: the save is
// PUT /recipes/{id}, a full replace. Two overlapping PUTs would race, and the
// loser's body — not the newest one — could land last. So at most one is in
// flight; anything typed meanwhile is folded into ONE follow-up carrying the
// newest value.

import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
export type SaveStatus = { state: SaveState; at: number | null; error: Error | null }

const IDLE: SaveStatus = { state: 'idle', at: null, error: null }

export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<unknown>,
  { enabled = true, delay = 800 }: { enabled?: boolean; delay?: number } = {},
): { status: SaveStatus; retry: () => void } {
  const [status, setStatus] = useState<SaveStatus>(IDLE)

  // Refs, not state: these drive an imperative timer/flight machine and must not
  // re-trigger the effect that schedules saves.
  const latest = useRef(value)
  const saveRef = useRef(save)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const queued = useRef(false)
  const baseline = useRef(value) // the last value known to be persisted
  const wasEnabled = useRef(false)
  const enabledRef = useRef(enabled)

  latest.current = value
  saveRef.current = save
  enabledRef.current = enabled

  const dirty = () => !Object.is(latest.current, baseline.current)

  const run = useCallback(() => {
    if (inFlight.current) {
      queued.current = true
      return
    }
    const pending = latest.current
    inFlight.current = true
    setStatus({ state: 'saving', at: null, error: null })

    saveRef
      .current(pending)
      .then(() => {
        baseline.current = pending
        setStatus({ state: 'saved', at: Date.now(), error: null })
      })
      .catch((error: unknown) => {
        setStatus({ state: 'error', at: null, error: error as Error })
      })
      .finally(() => {
        inFlight.current = false
        // Something changed while we were saving — fold it into one more save.
        if (queued.current) {
          queued.current = false
          run()
        }
      })
  }, [])

  useEffect(() => {
    // While disabled (a new recipe, or one still loading) the value is tracked but
    // never sent, so the moment autosave switches on it has nothing to catch up on.
    if (!enabled) {
      baseline.current = value
      wasEnabled.current = false
      return
    }

    // First enabled render: adopt what's there (the freshly loaded recipe) as the
    // baseline. Without this the null -> loaded transition reads as an edit and
    // every recipe would be re-saved the instant it's opened.
    if (!wasEnabled.current) {
      wasEnabled.current = true
      baseline.current = value
      return
    }

    if (Object.is(value, baseline.current)) return // nothing new to persist

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      run()
    }, delay)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value, enabled, delay, run])

  // In-app navigation unmounts the editor; a pending debounce would silently drop
  // the last keystrokes, so fire it now. The PUT outlives the component.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
      if (enabledRef.current && !inFlight.current && dirty()) void saveRef.current(latest.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Closing the tab mid-save loses the change; warn while one is outstanding.
  useEffect(() => {
    const pendingWork = () => timer.current !== null || inFlight.current || status.state === 'error'
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingWork()) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [status.state])

  const retry = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    run()
  }, [run])

  return { status, retry }
}
