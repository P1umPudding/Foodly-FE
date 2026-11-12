// The category page's own search/sort/view, kept in its URL only: unlike the list, nothing is restored from or saved
// to the stored list state, so this page never changes what /recipes opens with.
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEFAULT_STATE, type ListState } from './state'
import { fromSearchParams, toSearchParams } from './url'

const PAGE_KEYS = ['q', 'sort', 'dir', 'view'] as const

export function useCategoryPageState() {
  const [params, setParams] = useSearchParams()
  const parsed = fromSearchParams(params)
  const state: ListState = {
    ...DEFAULT_STATE,
    search: parsed.search,
    sortKey: parsed.sortKey,
    sortDir: parsed.sortDir,
    detail: parsed.detail,
    grouped: false,
  }

  const write = useCallback(
    (patch: Partial<ListState>, replace: boolean) => {
      setParams(
        (prev) => {
          // toSearchParams leaves defaults out; of the rest only this page's keys are taken over.
          const encoded = toSearchParams({ ...fromSearchParams(prev), ...patch })
          const next = new URLSearchParams()
          for (const key of PAGE_KEYS) {
            const value = encoded.get(key)
            if (value !== null) next.set(key, value)
          }
          return next
        },
        { replace },
      )
    },
    [setParams],
  )

  const set = useCallback((patch: Partial<ListState>) => write(patch, false), [write])
  // Typing replaces the entry, so Back never walks back letter by letter.
  const setSearch = useCallback((search: string) => write({ search }, true), [write])

  return { state, set, setSearch }
}

