// Which page the user came from, per history entry: a push records the page being left (with the label it
// showed), a replace keeps the replaced entry's origin (size steps, new → edit), back/forward look it up again.
// Kept in sessionStorage keyed by the history entry, so a reload still knows it. The label is the one shown when the
// user left, so a later rename shows up only on the next visit.
import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import type { Origin } from './origin'

const STORAGE_KEY = 'foodly.origin'
const MAX_ENTRIES = 50

type OriginMap = Record<string, Origin | null>

function load(): OriginMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as OriginMap) : {}
  } catch {
    return {}
  }
}

// Insertion order is visit order, so the oldest entries go first.
function trim(map: OriginMap): OriginMap {
  const keys = Object.keys(map)
  return keys.length > MAX_ENTRIES ? Object.fromEntries(keys.slice(-MAX_ENTRIES).map((k) => [k, map[k]])) : map
}

function save(map: OriginMap) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Storage full or blocked: the origin just doesn't survive a reload.
  }
}

// `currentLabel`: what the current page would be called as an origin (its crumb name or a static label), null when
// it has none (then the next page falls back to its parent).
export function useOrigin(currentLabel: string | null): Origin | null {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [origins, setOrigins] = useState(load)
  const left = useRef<{ key: string; href: string; label: string | null } | null>(null)

  // Layout effects: the new entry's origin is known before the browser paints, so the crumb doesn't flash the fallback.
  useLayoutEffect(() => {
    const prev = left.current
    if (!prev || prev.key === location.key) return
    let origin: Origin | null | undefined
    if (navigationType === 'PUSH') origin = prev.label !== null ? { label: prev.label, href: prev.href } : null
    else if (navigationType === 'REPLACE') origin = origins[prev.key]
    if (origin === undefined) return
    const next = trim({ ...origins, [location.key]: origin })
    setOrigins(next)
    save(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new entry records an origin, a label change on the same entry must not
  }, [location.key])

  useLayoutEffect(() => {
    left.current = { key: location.key, href: location.pathname + location.search, label: currentLabel }
  })

  return origins[location.key] ?? null
}
