import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCurrentUserId } from '../catalog/CatalogProvider'
import { DEFAULT_STATE, clearedState, type ListState } from './state'
import { fromSearchParams, toSearchParams } from './url'
import { loadPersisted, savePersisted } from './persistence'

const OUR_KEYS = ['cat', 'tag', 'ing', 'dmax', 'dfield', 'role', 'collab', 'q', 'sort', 'dir', 'view', 'group']

export function useListState(): { state: ListState; set: (patch: Partial<ListState>) => void; clear: () => void } {
  const [params, setParams] = useSearchParams()
  const currentUserId = useCurrentUserId()
  const hydrated = useRef(false)

  const urlHasOurParams = useMemo(() => OUR_KEYS.some((k) => params.has(k)), [params])

  const state = useMemo<ListState>(() => fromSearchParams(params), [params])

  // One-time hydration: bare URL → restore personal defaults from localStorage,
  // reflect them into the URL (replace = no history entry). URL params win if present.
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    if (urlHasOurParams) {
      savePersisted(currentUserId, state)
      return
    }
    const persisted = loadPersisted(currentUserId)
    if (persisted) {
      const restored = { ...DEFAULT_STATE, ...persisted, search: '' }
      setParams(toSearchParams(restored), { replace: true })
    }
  }, [urlHasOurParams, state, currentUserId, setParams])

  const set = useCallback(
    (patch: Partial<ListState>) => {
      const next = { ...fromSearchParams(params), ...patch }
      savePersisted(currentUserId, next)
      setParams(toSearchParams(next))
    },
    [params, currentUserId, setParams],
  )

  const clear = useCallback(() => set(clearedState(fromSearchParams(params))), [params, set])

  return { state, set, clear }
}
