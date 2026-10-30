// Loads the app-wide lookup catalogs (tags, users, current user, categories) once at
// startup. Tag *images* are never bulk-loaded — Tag.svg is only a hash; the
// image would be fetched lazily per tag when actually rendered.
import { createContext, useContext, type ReactNode } from 'react'
import { Loader } from '@postxl/ui-components'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import type { Ingredient, IngredientId, Tag, TagId, User, UserCategory, UserId } from '../api/protocol'

export type CatalogStatus = 'ready' | 'error'
export type CategoriesStatus = 'loading' | 'ready' | 'error'

type Catalog = {
  tags: { byId: Record<TagId, Tag>; status: CatalogStatus }
  users: { byId: Record<UserId, User>; status: CatalogStatus }
  me: User | null
  ingredients: { byId: Record<IngredientId, Ingredient>; status: CatalogStatus }
  categories: { list: UserCategory[]; status: CategoriesStatus }
}

const CatalogContext = createContext<Catalog | null>(null)

function indexBy<T, K extends string | number>(rows: T[] | null, key: (t: T) => K): Record<K, T> {
  const out = {} as Record<K, T>
  for (const row of rows ?? []) out[key(row)] = row
  return out
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const tagsReq = useRequest(() => foodly.listTags(), [])
  const usersReq = useRequest(() => foodly.listUsers(), [])
  const meReq = useRequest(() => foodly.me(), [])
  const ingredientsReq = useRequest(() => foodly.listIngredients(), [])
  // Shared by the shell's sidebar and the list, so it is fetched once per session instead of on every
  // list mount. Not part of the settled gate below: both places show their own loading state. Once the
  // FE can change categories, that change has to refresh this request.
  const categoriesReq = useRequest(() => foodly.listCategories(), [])

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

  const value: Catalog = {
    tags: { byId: indexBy(tagsReq.data, (t) => t.id), status: tagsReq.status === 'error' ? 'error' : 'ready' },
    users: { byId: indexBy(usersReq.data, (u) => u.id), status: usersReq.status === 'error' ? 'error' : 'ready' },
    me: meReq.data,
    ingredients: {
      byId: indexBy(ingredientsReq.data, (i) => i.id),
      status: ingredientsReq.status === 'error' ? 'error' : 'ready',
    },
    categories: { list: categoriesReq.data ?? [], status: categoriesReq.status },
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
export function useIngredients() {
  return useCatalog().ingredients
}
export function useIngredient(id: IngredientId): Ingredient | undefined {
  return useCatalog().ingredients.byId[id]
}
