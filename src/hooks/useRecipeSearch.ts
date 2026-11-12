import { useCallback, useEffect, useRef, useState } from 'react'
import { foodly } from '../api'
import { toError } from '../lib/toError'
import type { Recipe, RecipeSearchQuery } from '../api/protocol'

type Status = 'loading' | 'ready' | 'error'

export type RecipeSearchResult = {
  recipes: Recipe[]
  status: Status
  error: Error | null
  hasMore: boolean
  loadingMore: boolean
  loadMoreError: Error | null
  loadMore: () => void
  retryLoadMore: () => void
  reload: () => void
}

// Accumulating, cursor-paginated recipe search. useRequest can't drive this — it
// is one-shot and nulls data on every run — so pagination state lives here.
// Changing the query (by value, via its JSON key) resets to page 1.
// A failed next page keeps its cursor and pauses paging until retryLoadMore: the list's
// sentinel calls loadMore again on every re-subscription, so retrying there would loop.
export function useRecipeSearch(query: RecipeSearchQuery): RecipeSearchResult {
  const key = JSON.stringify(query)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)
  // Bumped on every query-epoch change so stale loadMore responses are dropped.
  const epoch = useRef(0)

  useEffect(() => {
    const mine = ++epoch.current
    setStatus('loading')
    setError(null)
    setRecipes([])
    setCursor(null)
    setLoadingMore(false)
    setLoadMoreError(null)
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
        setError(toError(e))
        setStatus('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query is tracked by value through key; callers build a new object every render, so listing it would refetch page 1 on each one
  }, [key, nonce])

  const fetchPage = useCallback(
    (page: number) => {
      const mine = epoch.current
      setLoadingMore(true)
      foodly
        .searchRecipes(query, page)
        .then((res) => {
          if (mine !== epoch.current) return
          setRecipes((prev) => [...prev, ...res.items])
          setCursor(res.cursor)
        })
        .catch((e: unknown) => {
          if (mine === epoch.current) setLoadMoreError(toError(e))
        })
        .finally(() => {
          if (mine === epoch.current) setLoadingMore(false)
        })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key (query by value) replaces query; a per-render fetchPage would re-subscribe the sentinel and refire loadMore
    [key],
  )

  const loadMore = useCallback(() => {
    if (cursor === null || loadingMore || loadMoreError !== null) return
    fetchPage(cursor)
  }, [cursor, loadingMore, loadMoreError, fetchPage])

  // Clearing the error and setting loadingMore in one batch keeps the sentinel's next loadMore a no-op.
  const retryLoadMore = useCallback(() => {
    if (cursor === null || loadingMore || loadMoreError === null) return
    setLoadMoreError(null)
    fetchPage(cursor)
  }, [cursor, loadingMore, loadMoreError, fetchPage])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return {
    recipes,
    status,
    error,
    hasMore: cursor !== null,
    loadingMore,
    loadMoreError,
    loadMore,
    retryLoadMore,
    reload,
  }
}
