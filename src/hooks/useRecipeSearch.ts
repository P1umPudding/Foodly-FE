import { useCallback, useEffect, useRef, useState } from 'react'
import { foodly } from '../api'
import type { Recipe, RecipeSearchQuery } from '../api/protocol'

type Status = 'loading' | 'ready' | 'error'

export type RecipeSearchResult = {
  recipes: Recipe[]
  status: Status
  error: Error | null
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
  reload: () => void
}

// Accumulating, cursor-paginated recipe search. useRequest can't drive this — it
// is one-shot and nulls data on every run — so pagination state lives here.
// Changing the query (by value, via its JSON key) resets to page 1.
export function useRecipeSearch(query: RecipeSearchQuery): RecipeSearchResult {
  const key = JSON.stringify(query)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nonce, setNonce] = useState(0)
  // Bumped on every query-epoch change so stale loadMore responses are dropped.
  const epoch = useRef(0)

  useEffect(() => {
    const mine = ++epoch.current
    setStatus('loading')
    setError(null)
    setRecipes([])
    setCursor(null)
    foodly
      .searchRecipes(query, 1)
      .then((res) => {
        if (mine !== epoch.current) return
        setRecipes(res.items)
        setCursor(res.cursor)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (mine !== epoch.current) return
        setError(e as Error)
        setStatus('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])

  const loadMore = useCallback(() => {
    if (cursor === null || loadingMore) return
    const mine = epoch.current
    const page = cursor
    setLoadingMore(true)
    foodly
      .searchRecipes(query, page)
      .then((res) => {
        if (mine !== epoch.current) return
        setRecipes((prev) => [...prev, ...res.items])
        setCursor(res.cursor)
      })
      .catch(() => {
        if (mine === epoch.current) setCursor(null) // stop paging on error
      })
      .finally(() => {
        if (mine === epoch.current) setLoadingMore(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loadingMore, key])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { recipes, status, error, hasMore: cursor !== null, loadingMore, loadMore, reload }
}
