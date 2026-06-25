import { useCallback, useEffect, useRef, useState } from 'react'

// Keep the screen awake (Screen Wake Lock API) — handy on mobile while cooking.
// The browser drops the lock when the tab is hidden, so we re-acquire it on
// `visibilitychange` while enabled.
export function useWakeLock(initial = false) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  const [enabled, setEnabled] = useState(initial && supported)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!supported || !enabled) return

    let cancelled = false

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        sentinelRef.current = await navigator.wakeLock.request('screen')
      } catch {
        // Request can reject (e.g. low battery, not focused) — give up quietly.
        if (!cancelled) setEnabled(false)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
    }
  }, [enabled, supported])

  const toggle = useCallback(() => setEnabled((v) => !v), [])

  return { enabled, supported, setEnabled, toggle }
}
