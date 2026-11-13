// Loads the app-wide lookup catalogs (tags, current user, ingredients, categories) at
// startup; users are fetched on demand (useUser). Tag *images* are never bulk-loaded —
// Tag.svg is only a hash; the image would be fetched lazily per tag when actually rendered.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Loader } from '@postxl/ui-components'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { RetryAlert } from '../components/RetryAlert'
import { toError } from '../lib/toError'
import type { Ingredient, IngredientId, Tag, TagId, User, UserCategory, UserCategoryId, UserId } from '../api/protocol'

export type CatalogStatus = 'ready' | 'error'
export type CategoriesStatus = 'loading' | 'ready' | 'error'

type Catalog = {
  tags: { byId: Record<TagId, Tag>; status: CatalogStatus }
  users: { byId: Record<UserId, User>; request: (id: UserId) => void }
  me: User | null
  ingredients: { byId: Record<IngredientId, Ingredient>; status: CatalogStatus }
  categories: { list: UserCategory[]; status: CategoriesStatus; error: Error | null; retry: () => void }
  refreshCategories: () => void
  categoryWriter: CategoryWriter
}

type CategoryWriter = {
  patch: (change: (list: UserCategory[]) => UserCategory[]) => boolean
  reorder: (ids: UserCategoryId[]) => Promise<void>
  refresh: () => void
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
// that already arrived. A failure only counts once no other call is still in flight (that one may yet
// succeed) and never replaces a loaded list.
// Writes (useCategoryActions) patch the list locally; a patch outranks every load still in flight, which is then
// started again so a membership change it carried isn't lost. Reorders are optimistic and run one after another;
// while one is pending, loads that land get its order. A load the server answered before the PUT committed but
// that lands after it still shows the old order until the next load (needs a concurrent copy/delete; accepted).
function useCategoriesState() {
  const [state, setState] = useState<CategoriesState>({ list: [], status: 'loading', error: null })
  // Writes read the list synchronously; a ref written during render would lag behind a setState not rendered yet.
  const current = useRef(state)
  const commit = useCallback((next: CategoriesState) => {
    current.current = next
    setState(next)
  }, [])
  const latest = useRef(0)
  const applied = useRef(0)
  const inFlight = useRef(new Set<number>())
  const mounted = useRef(false)
  const pendingOrder = useRef<UserCategoryId[] | null>(null)
  const reorderQueue = useRef<Promise<void>>(Promise.resolve())
  const reorderSeq = useRef(0)
  const reordersPending = useRef(0)
  // The last order the server accepted, to roll back to when the latest reorder fails.
  const confirmedOrder = useRef(new Map<UserCategoryId, number | null>())

  const load = useCallback(
    (mode: 'initial' | 'background') => {
      if (!mounted.current) return
      const mine = ++latest.current
      inFlight.current.add(mine)
      if (mode === 'initial') commit({ list: [], status: 'loading', error: null })
      foodly
        .listCategories()
        .then((list) => {
          inFlight.current.delete(mine)
          if (mine <= applied.current) return
          applied.current = mine
          const order = pendingOrder.current
          commit({ list: order ? withOrder(list, order) : list, status: 'ready', error: null })
        })
        .catch((error: unknown) => {
          inFlight.current.delete(mine)
          if (mine <= applied.current || inFlight.current.size > 0) return
          if (current.current.status !== 'ready') commit({ list: [], status: 'error', error: toError(error) })
        })
    },
    [commit],
  )

  useEffect(() => {
    // Calls from before a (StrictMode) remount must not land.
    const seen = applied
    const pending = inFlight.current
    seen.current = latest.current
    pending.clear()
    mounted.current = true
    load('initial')
    return () => {
      mounted.current = false
      seen.current = Number.MAX_SAFE_INTEGER // unmounted: drop whatever is still in flight
    }
  }, [load])

  const refresh = useCallback(() => load('background'), [load])
  const retry = useCallback(() => load('initial'), [load])

  // false = nothing patched (not loaded, or unmounted).
  const patch = useCallback(
    (change: (list: UserCategory[]) => UserCategory[]): boolean => {
      if (!mounted.current || current.current.status !== 'ready') return false
      const dropped = inFlight.current.size > 0
      applied.current = Math.max(applied.current, latest.current)
      commit({ ...current.current, list: change(current.current.list) })
      if (dropped) load('background')
      return true
    },
    [commit, load],
  )

  const reorder = useCallback(
    async (ids: UserCategoryId[]): Promise<void> => {
      const before = new Map(current.current.list.map((c) => [c.id, c.order]))
      if (!patch((list) => withOrder(list, ids))) throw new Error('Kategorien sind noch nicht geladen')
      if (reordersPending.current === 0) confirmedOrder.current = before
      reordersPending.current++
      const mine = ++reorderSeq.current
      pendingOrder.current = ids
      const call = reorderQueue.current.then(() => foodly.reorderCategories(ids))
      reorderQueue.current = call.catch(() => {})
      try {
        await call
        ids.forEach((id, index) => confirmedOrder.current.set(id, index))
      } catch (error) {
        // An earlier failure with later reorders queued changes nothing: the latest one decides.
        if (mine === reorderSeq.current) {
          pendingOrder.current = null
          if (!patch((list) => withOrders(list, confirmedOrder.current))) refresh()
        }
        throw error
      } finally {
        reordersPending.current--
        if (mine === reorderSeq.current) pendingOrder.current = null
      }
    },
    [patch, refresh],
  )

  const writer = useMemo<CategoryWriter>(() => ({ patch, reorder, refresh }), [patch, reorder, refresh])
  return { ...state, refresh, retry, writer }
}

// Ids the map doesn't know keep their order; sorted like GET /categories (order, then id).
function withOrders(list: UserCategory[], orders: Map<UserCategoryId, number | null>): UserCategory[] {
  return list
    .map((c) => (orders.has(c.id) ? { ...c, order: orders.get(c.id) ?? null } : c))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)
}

function withOrder(list: UserCategory[], ids: UserCategoryId[]): UserCategory[] {
  return withOrders(list, new Map(ids.map((id, index) => [id, index])))
}

// Names for owners, editors and raters. useUser reports ids it doesn't know; all reported in one render are
// fetched in one request (microtask). An id is asked for once per page load: found, not found or failed alike,
// so an unknown id doesn't refetch on every render. RequireAuth keys the provider by user, so a switch starts empty.
// No unmount guard: the refs survive StrictMode's double effect, and a guard would drop the in-flight answer.
function useUserDirectory(me: User | null) {
  const [byId, setById] = useState<Record<UserId, User>>({})
  const asked = useRef(new Set<UserId>())
  const queue = useRef<UserId[]>([])

  const flush = useCallback(() => {
    const ids = queue.current
    queue.current = []
    foodly
      .getUsers(ids)
      .then((users) => setById((known) => ({ ...known, ...indexBy(users, (u) => u.id) })))
      .catch(() => {}) // the ids count as not found until the next page load
  }, [])

  const meId = me?.id
  const request = useCallback(
    (id: UserId) => {
      if (id === meId || asked.current.has(id)) return
      asked.current.add(id)
      queue.current.push(id)
      if (queue.current.length === 1) queueMicrotask(flush)
    },
    [meId, flush],
  )

  const withMe = useMemo(() => (me ? { ...byId, [me.id]: me } : byId), [byId, me])
  return { byId: withMe, request }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const tagsReq = useRequest(() => foodly.listTags(), [])
  const meReq = useRequest(() => foodly.me(), [])
  const users = useUserDirectory(meReq.data)
  const ingredientsReq = useRequest(() => foodly.listIngredients(), [])
  // Not part of the settled gate below: the sidebar and the list show their own loading state.
  const categories = useCategoriesState()

  // Graceful degrade: render children once every load has *settled* (ready or
  // error). A failed catalog just yields an empty map + 'error' status; the UI
  // degrades (tokens stay literal) rather than crashing. Users aren't waited for: names fill in as they arrive.
  const settled = [tagsReq, meReq, ingredientsReq].every((r) => r.status !== 'loading')
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
    users,
    me: meReq.data,
    ingredients: {
      byId: indexBy(ingredientsReq.data, (i) => i.id),
      status: ingredientsReq.status === 'error' ? 'error' : 'ready',
    },
    categories: { list: categories.list, status: categories.status, error: categories.error, retry: categories.retry },
    refreshCategories: categories.refresh,
    categoryWriter: categories.writer,
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
export function useTag(id: TagId): Tag | undefined {
  return useCatalog().tags.byId[id]
}
export function useUser(id: UserId): User | undefined {
  const { byId, request } = useCatalog().users
  useEffect(() => {
    request(id)
  }, [id, request])
  return byId[id]
}
// The known users among `ids`, in order; unknown ones are requested and left out until they load.
export function useUsers(ids: readonly UserId[]): User[] {
  const { byId, request } = useCatalog().users
  const key = ids.join(',')
  useEffect(() => {
    if (key) for (const id of key.split(',')) request(Number(id))
  }, [key, request])
  return ids.flatMap((id) => (byId[id] ? [byId[id]] : []))
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
// Internal to src/catalog: components write through useCategoryActions.
export function useCategoryWriter(): CategoryWriter {
  return useCatalog().categoryWriter
}
export function useIngredients() {
  return useCatalog().ingredients
}
export function useIngredient(id: IngredientId): Ingredient | undefined {
  return useCatalog().ingredients.byId[id]
}
