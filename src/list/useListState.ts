import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useCurrentUserId } from '../catalog/CatalogProvider'
import { DEFAULT_STATE, clearedState, type ListState } from './state'
import { fromSearchParams, toSearchParams } from './url'
import { loadPersisted, savePersisted } from './persistence'

const OUR_KEYS = ['cat', 'tag', 'ing', 'dmax', 'role', 'collab', 'q', 'sort', 'dir', 'view', 'group']

// Router location state marking the history entry a search started; typing on it replaces instead of pushing.
const SEARCH_ENTRY_STATE = { listSearch: true } as const

const isSearchEntry = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && (state as { listSearch?: unknown }).listSearch === true

export function useListState(): {
  state: ListState
  set: (patch: Partial<ListState>) => void
  setSearch: (search: string) => void
  clear: () => void
} {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
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

  // The shell's nav links change the URL without going through set(); persist whatever the list shows,
  // so "Zurück" to a bare /recipes comes back to what the user last saw. Must stay below the hydration
  // effect: on a bare URL this first saves the defaults over the stored state, which works only because
  // hydration has read it just before; its replace then saves the restored state again.
  useEffect(() => {
    savePersisted(currentUserId, state)
  }, [state, currentUserId])

  const apply = useCallback(
    (patch: Partial<ListState>, replace: boolean, entryState?: unknown) => {
      const next = { ...fromSearchParams(params), ...patch }
      savePersisted(currentUserId, next)
      setParams(toSearchParams(next), { replace, state: entryState })
    },
    [params, currentUserId, setParams],
  )

  const set = useCallback((patch: Partial<ListState>) => apply(patch, false), [apply])

  // A search gets ONE history entry: the first keystroke pushes, everything after (more letters, clearing,
  // retyping) replaces it, so Back lands on the state before the search instead of walking back letter by
  // letter, and the preceding filter entry is never overwritten. Trade-off: after clearing, that entry shows
  // the same list as the one before it, so one Back changes nothing visible.
  const setSearch = useCallback(
    (search: string) => {
      if (isSearchEntry(location.state)) apply({ search }, true, SEARCH_ENTRY_STATE)
      // blank `q` is dropped from the URL, so this would only push a duplicate
      else if (search.trim() === '') apply({ search }, true)
      else apply({ search }, false, SEARCH_ENTRY_STATE)
    },
    [location.state, apply],
  )

  const clear = useCallback(() => set(clearedState(fromSearchParams(params))), [params, set])

  return { state, set, setSearch, clear }
}
