// Loads the app-wide lookup catalogs (tags, users, current user, categories) at
// startup. Tag *images* are never bulk-loaded — Tag.svg is only a hash; the
// image would be fetched lazily per tag when actually rendered.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader } from '@postxl/ui-components'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { RetryAlert } from '../components/RetryAlert'
import { toError } from '../lib/toError'
import type { Ingredient, IngredientId, Tag, TagId, User, UserCategory, UserId } from '../api/protocol'

export type CatalogStatus = 'ready' | 'error'
export type CategoriesStatus = 'loading' | 'ready' | 'error'

type Catalog = {
  tags: { byId: Record<TagId, Tag>; status: CatalogStatus }
  users: { byId: Record<UserId, User>; status: CatalogStatus }
  me: User | null
  ingredients: { byId: Record<IngredientId, Ingredient>; status: CatalogStatus }
  categories: { list: UserCategory[]; status: CategoriesStatus; error: Error | null; retry: () => void }
  refreshCategories: () => void
}

type CategoriesState = { list: UserCategory[]; status: CategoriesStatus; error: Error | null }

const CatalogContext = createContext<Catalog | null>(null)

function indexBy<T, K extends string | number>(rows: T[] | null, key: (t: T) => K): Record<K, T> {
  const out = {} as Record<K, T>
  for (const row of rows ?? []) out[key(row)] = row
  return out
}

// Shared by the shell's sidebar and the list, so it is fetched once at startup instead of on every list
// mount. A recipe mutation that changes category membership (create, copy, delete) calls `refresh`, which
// reloads in the background: the old list stays (status 'ready') until the new one arrives, and a failed
// refresh keeps it. Only the first load and `retry` report 'loading'. A response never replaces a newer one
// that already arrived, and only the latest call's failure counts, so a refresh started during the first
// load can't turn that load's success into an error.
function useCategoriesState() {
  const [state, setState] = useState<CategoriesState>({ list: [], status: 'loading', error: null })
  const latest = useRef(0)
  const applied = useRef(0)

  const load = useCallback((mode: 'initial' | 'background') => {
    const mine = ++latest.current
    if (mode === 'initial') setState({ list: [], status: 'loading', error: null })
    foodly
      .listCategories()
      .then((list) => {
        if (mine <= applied.current) return
        applied.current = mine
        setState({ list, status: 'ready', error: null })
      })
      .catch((error: unknown) => {
        if (mine !== latest.current || mine <= applied.current) return
        setState((prev) =>
          mode === 'background' && prev.status === 'ready'
            ? prev
            : { list: [], status: 'error', error: toError(error) },
        )
      })
  }, [])

  useEffect(() => {
    const seen = applied
    seen.current = latest.current // calls from before a (StrictMode) remount must not land
    load('initial')
    return () => {
      seen.current = Number.MAX_SAFE_INTEGER // unmounted: drop whatever is still in flight
    }
  }, [load])

  const refresh = useCallback(() => load('background'), [load])
  const retry = useCallback(() => load('initial'), [load])
  return { ...state, refresh, retry }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const tagsReq = useRequest(() => foodly.listTags(), [])
  const usersReq = useRequest(() => foodly.listUsers(), [])
  const meReq = useRequest(() => foodly.me(), [])
  const ingredientsReq = useRequest(() => foodly.listIngredients(), [])
  // Not part of the settled gate below: the sidebar and the list show their own loading state.
  const categories = useCategoriesState()

  // Graceful degrade: render children once every load has *settled* (ready or
  // error). A failed catalog just yields an empty map + 'error' status; the UI
  // degrades (tokens stay literal, user names fall back) rather than crashing.
  const settled = [tagsReq, usersReq, meReq, ingredientsReq].every((r) => r.status !== 'loading')
  if (!settled) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader />
      </div>
    )
  }

  // Without the current user nothing below works (the list hides every recipe, the editor says "Kein
  // Zugriff", per-user settings would be stored under no user), so the app waits for a retry instead.
  if (meReq.status === 'error') {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="sr-only">Foodly</h1>
        <RetryAlert title="Konnte Profil nicht laden" message={meReq.error?.message} onRetry={meReq.reload} />
      </main>
    )
  }

  const value: Catalog = {
    tags: { byId: indexBy(tagsReq.data, (t) => t.id), status: tagsReq.status === 'error' ? 'error' : 'ready' },
    users: { byId: indexBy(usersReq.data, (u) => u.id), status: usersReq.status === 'error' ? 'error' : 'ready' },
    me: meReq.data,
    ingredients: {
      byId: indexBy(ingredientsReq.data, (i) => i.id),
      status: ingredientsReq.status === 'error' ? 'error' : 'ready',
    },
    categories: { list: categories.list, status: categories.status, error: categories.error, retry: categories.retry },
    refreshCategories: categories.refresh,
  }

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

function useCatalog(): Catalog {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within <CatalogProvider>')
  return ctx
}

export function useTags() {
  return useCatalog().tags
}
export function useUsers() {
  return useCatalog().users
}
export function useTag(id: TagId): Tag | undefined {
  return useCatalog().tags.byId[id]
}
export function useUser(id: UserId): User | undefined {
  return useCatalog().users.byId[id]
}
export function useCurrentUserId(): UserId | null {
  return useCatalog().me?.id ?? null
}
export function useMe(): User | null {
  return useCatalog().me
}
export function useCategories() {
  return useCatalog().categories
}
export function useRefreshCategories(): () => void {
  return useCatalog().refreshCategories
}
export function useIngredients() {
  return useCatalog().ingredients
}
export function useIngredient(id: IngredientId): Ingredient | undefined {
  return useCatalog().ingredients.byId[id]
}
