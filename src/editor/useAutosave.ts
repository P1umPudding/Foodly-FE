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
  {
    enabled = true,
    delay = 800,
    onFlushError,
  }: { enabled?: boolean; delay?: number; onFlushError?: (error: unknown) => void } = {},
): { status: SaveStatus; retry: () => void; flush: () => Promise<void> } {
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
  const onFlushErrorRef = useRef(onFlushError)
  // Flips false in the unmount-flush cleanup so a rejection that resolves after
  // that point knows there's no component left to carry status on.
  const mounted = useRef(true)
  // Mirrors status.state for the beforeunload listener, which is registered once
  // and so can't close over `status` directly.
  const statusRef = useRef<SaveState>('idle')
  // One shared deferred for every flush() caller: they all wait for the same chain.
  const waiter = useRef<{ promise: Promise<void>; resolve: () => void; reject: (e: unknown) => void } | null>(null)
  // The value the most recent save sent and how it ended, so settling can tell
  // "this exact value failed" from "a newer edit still needs saving".
  const lastAttempt = useRef<{ value: T; error: unknown } | null>(null)

  latest.current = value
  saveRef.current = save
  enabledRef.current = enabled
  onFlushErrorRef.current = onFlushError

  const dirty = () => !Object.is(latest.current, baseline.current)

  const updateStatus = (next: SaveStatus) => {
    statusRef.current = next.state
    setStatus(next)
  }

  const run = useCallback(() => {
    if (inFlight.current) {
      queued.current = true
      return
    }
    const pending = latest.current
    inFlight.current = true
    updateStatus({ state: 'saving', at: null, error: null })

    saveRef
      .current(pending)
      .then(() => {
        baseline.current = pending
        lastAttempt.current = { value: pending, error: null }
        updateStatus({ state: 'saved', at: Date.now(), error: null })
      })
      .catch((error: unknown) => {
        lastAttempt.current = { value: pending, error }
        // This fires asynchronously (after the await), so if unmount happened
        // in between, `mounted` is already false — route to the flush-error
        // callback instead of setting status on a component that's gone.
        if (mounted.current) updateStatus({ state: 'error', at: null, error: error as Error })
        else onFlushErrorRef.current?.(error)
      })
      .finally(() => {
        inFlight.current = false
        // Something changed while we were saving — fold it into one more save.
        if (queued.current) {
          queued.current = false
          run()
        } else if (waiter.current) {
          settleWaiter()
        }
      })
  }, [])

  // Runs after a flight with nothing queued. Also after unmount: a flush() caller
  // may still be awaiting, and its promise must not be left hanging.
  const settleWaiter = () => {
    const w = waiter.current
    if (!w) return
    const attempt = lastAttempt.current
    if (!enabledRef.current || !dirty()) {
      waiter.current = null
      w.resolve()
    } else if (attempt && attempt.error !== null && Object.is(attempt.value, latest.current)) {
      waiter.current = null
      w.reject(attempt.error)
    } else {
      // A newer edit than the last attempt (typed while waiting): save it now
      // instead of letting its debounce run.
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
      run()
    }
  }

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
    //
    // Contract: consumers must not enable autosave until `value` holds its loaded
    // state — enable and the load must land in the same commit (both derived from
    // one state value), or the load will be mis-seen as an edit and saved back.
    // This hook can't tell "just loaded" from "just edited" on its own, so it isn't
    // enforced here.
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
    // Re-arm on (re)mount: StrictMode dev double-invoke runs setup->cleanup->setup
    // reusing this ref, so without this the first cleanup leaves mounted stuck
    // false and a genuinely-mounted save failure would misroute to onFlushError.
    mounted.current = true
    return () => {
      mounted.current = false
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
      if (!enabledRef.current || !dirty()) return
      // A save already in flight can't be joined here — its .finally() is the
      // only place allowed to start the next one, so queue for it to pick up
      // latest.current instead of firing a second overlapping save.
      if (inFlight.current) queued.current = true
      // On unmount the component is gone, so there's no status UI left to show
      // an error — still catch it (no unhandled rejection) but forward it to
      // onFlushError so the caller can surface it another way (e.g. a toast).
      else saveRef.current(latest.current).catch((e) => onFlushErrorRef.current?.(e))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Closing the tab mid-save loses the change; warn while one is outstanding.
  // Registered once (not per status change) so the native listener isn't torn
  // down and re-added on every idle -> saving -> saved/error transition; the
  // ref-backed check below reads live state instead of a stale closure.
  useEffect(() => {
    const pendingWork = () => timer.current !== null || inFlight.current || statusRef.current === 'error'
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingWork()) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const retry = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    run()
  }, [run])

  // Saves whatever is pending right now and resolves once everything is persisted;
  // rejects if the newest value failed to save. Callers that must not move on with
  // a save outstanding (e.g. "Fertig" navigating to a page that re-fetches) await it.
  const flush = useCallback((): Promise<void> => {
    if (!enabledRef.current || (!inFlight.current && !dirty())) return Promise.resolve()
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (!waiter.current) {
      let resolve!: () => void
      let reject!: (e: unknown) => void
      const promise = new Promise<void>((res, rej) => {
        resolve = res
        reject = rej
      })
      waiter.current = { promise, resolve, reject }
    }
    const { promise } = waiter.current
    // Invariant: a waiter only exists while a flight is running (run() sets
    // inFlight synchronously), so that flight's .finally() is sure to settle it.
    if (!inFlight.current) run()
    return promise
  }, [run])

  return { status, retry, flush }
}
