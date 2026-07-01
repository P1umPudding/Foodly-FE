// Global kitchen-timer state. Lives above Nav and Routes so timers survive
// navigation (but not reload — no persistence). Remaining time is always derived
// from an absolute `endAt`, so a throttled background tab can't drift the clock.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from '@postxl/ui-components'
import { startAlarm, stopAlarm as stopAlarmSound, unlockAudio } from './alarm'

export type TimerId = string
export type TimerStatus = 'running' | 'paused' | 'expired'
export type Timer = {
  id: TimerId
  label: string
  durationMs: number
  remainingMs: number
  endAt: number | null
  status: TimerStatus
}

type TimerApi = {
  timers: Timer[]
  alarmingIds: Set<TimerId>
  nextRemainingMs: number | null
  add: (input: { label: string; durationMs: number }) => void
  pause: (id: TimerId) => void
  resume: (id: TimerId) => void
  restart: (id: TimerId) => void
  remove: (id: TimerId) => void
  stopAlarm: (id: TimerId) => void
}

const TimerContext = createContext<TimerApi | null>(null)

const TICK_MS = 250
const STORAGE_KEY = 'foodly.timers.v1'

function newId(): TimerId {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `t${Date.now()}-${Math.random()}`
}

// Only named timers persist (unnamed ones are throwaway). Running timers are
// restored from their absolute `endAt`: still-future → keep running. Anything
// that has hit 0 (elapsed while away, or stored expired/paused-at-0) is reset to
// its full duration and paused — ready to start again with a play button, rather
// than greeting you with a spent 00:00.
type PersistedTimer = Pick<Timer, 'id' | 'label' | 'durationMs' | 'status' | 'endAt' | 'remainingMs'>

function loadPersistedTimers(): Timer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved)) return []
    const now = Date.now()
    return (saved as PersistedTimer[])
      .filter((t) => t && typeof t.label === 'string' && t.label.trim() !== '')
      .map((t) => {
        if (t.status === 'running' && typeof t.endAt === 'number' && t.endAt - now > 0) {
          return { ...t, remainingMs: t.endAt - now }
        }
        if (t.status === 'paused' && t.remainingMs > 0) {
          return { ...t, endAt: null }
        }
        // At 0 (or elapsed while away): reset to full duration, paused & ready.
        return { ...t, status: 'paused' as TimerStatus, endAt: null, remainingMs: t.durationMs }
      })
  } catch {
    return []
  }
}

function persistTimers(timers: Timer[]): void {
  try {
    const named: PersistedTimer[] = timers
      .filter((t) => t.label.trim() !== '')
      .map((t) => ({
        id: t.id,
        label: t.label,
        durationMs: t.durationMs,
        status: t.status,
        endAt: t.endAt,
        // Running remaining is derived from endAt on load — don't store the
        // per-tick value or the write signature would thrash every 250 ms.
        remainingMs: t.status === 'running' ? 0 : t.remainingMs,
      }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(named))
  } catch {
    // Storage unavailable (private mode / quota) — persistence is best-effort.
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>(loadPersistedTimers)
  const [alarmingIds, setAlarmingIds] = useState<Set<TimerId>>(new Set())

  // Refs read by the interval callback so it never closes over stale state, and
  // so the running→expired alarm fires exactly once per transition (StrictMode
  // double-invokes the setTimers updater, so side-effects must live outside it).
  const timersRef = useRef(timers)
  timersRef.current = timers
  const alarmedIds = useRef<Set<TimerId>>(new Set())
  const toastIds = useRef<Map<TimerId, string | number>>(new Map())

  // Silence an alarm: stop the sound, drop the highlight, dismiss the toast. Does
  // NOT touch the timer row itself — callers decide whether to remove or reset it.
  const clearAlarm = useCallback((id: TimerId) => {
    stopAlarmSound(id)
    setAlarmingIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    const tid = toastIds.current.get(id)
    if (tid !== undefined) {
      toast.dismiss(tid)
      toastIds.current.delete(id)
    }
  }, [])

  const stopAlarm = useCallback(
    (id: TimerId) => {
      clearAlarm(id)
      // Unnamed timers are throwaway: stopping their alarm removes them rather than
      // leaving a spent expired row behind. Named ones stay (and stay persisted).
      const t = timersRef.current.find((x) => x.id === id)
      if (t && t.label.trim() === '') {
        alarmedIds.current.delete(id)
        setTimers((prev) => prev.filter((x) => x.id !== id))
      }
    },
    [clearAlarm],
  )

  const hasRunning = timers.some((t) => t.status === 'running')

  useEffect(() => {
    if (!hasRunning) return

    const tick = () => {
      const now = Date.now()

      // Side-effects first, from the ref and guarded — outside the updater.
      for (const t of timersRef.current) {
        if (t.status === 'running' && t.endAt !== null && t.endAt <= now && !alarmedIds.current.has(t.id)) {
          alarmedIds.current.add(t.id)
          // The 60s safety auto-stop only silences (clearAlarm) — it must not
          // delete an unnamed timer. Only an explicit Stopp removes it.
          startAlarm(t.id, () => clearAlarm(t.id))
          setAlarmingIds((prev) => new Set(prev).add(t.id))
          const label = t.label || 'Timer'
          const tid = toast(`Timer „${label}“ abgelaufen`, {
            duration: Infinity,
            action: { label: 'Stopp', onClick: () => stopAlarm(t.id) },
          })
          toastIds.current.set(t.id, tid)
        }
      }

      // Pure, idempotent updater: only advances remaining time / flips to expired.
      setTimers((prev) =>
        prev.map((t) => {
          if (t.status !== 'running' || t.endAt === null) return t
          const remainingMs = Math.max(0, t.endAt - now)
          return remainingMs === 0 ? { ...t, status: 'expired', endAt: null, remainingMs: 0 } : { ...t, remainingMs }
        }),
      )
    }

    const handle = setInterval(tick, TICK_MS)
    return () => clearInterval(handle)
  }, [hasRunning, stopAlarm, clearAlarm])

  // Persist named timers on any meaningful change. The signature excludes running
  // timers' per-tick remainingMs (recomputed from endAt on load), so ticking
  // doesn't trigger writes — only add/pause/resume/restart/remove/expiry do.
  const persistSig = JSON.stringify(
    timers
      .filter((t) => t.label.trim() !== '')
      .map((t) => [t.id, t.label, t.durationMs, t.status, t.status === 'running' ? t.endAt : t.remainingMs]),
  )
  useEffect(() => {
    persistTimers(timersRef.current)
  }, [persistSig])

  const add = useCallback(({ label, durationMs }: { label: string; durationMs: number }) => {
    unlockAudio()
    const now = Date.now()
    setTimers((prev) => [
      ...prev,
      { id: newId(), label, durationMs, remainingMs: durationMs, endAt: now + durationMs, status: 'running' },
    ])
  }, [])

  const pause = useCallback((id: TimerId) => {
    const now = Date.now()
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id && t.status === 'running' && t.endAt !== null
          ? { ...t, status: 'paused', remainingMs: Math.max(0, t.endAt - now), endAt: null }
          : t,
      ),
    )
  }, [])

  const resume = useCallback((id: TimerId) => {
    unlockAudio()
    const now = Date.now()
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id && t.status === 'paused' ? { ...t, status: 'running', endAt: now + t.remainingMs } : t,
      ),
    )
  }, [])

  // Reset to the full duration the timer was created with and run again — never
  // removes the row (clearAlarm, not stopAlarm, so an unnamed timer survives).
  const restart = useCallback(
    (id: TimerId) => {
      unlockAudio()
      clearAlarm(id)
      alarmedIds.current.delete(id)
      const now = Date.now()
      setTimers((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: 'running', remainingMs: t.durationMs, endAt: now + t.durationMs } : t,
        ),
      )
    },
    [clearAlarm],
  )

  const remove = useCallback(
    (id: TimerId) => {
      stopAlarm(id)
      alarmedIds.current.delete(id)
      setTimers((prev) => prev.filter((t) => t.id !== id))
    },
    [stopAlarm],
  )

  const runningRemaining = timers.filter((t) => t.status === 'running').map((t) => t.remainingMs)
  const nextRemainingMs = runningRemaining.length > 0 ? Math.min(...runningRemaining) : null

  const value: TimerApi = { timers, alarmingIds, nextRemainingMs, add, pause, resume, restart, remove, stopAlarm }
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimers(): TimerApi {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimers must be used within a TimerProvider')
  return ctx
}
