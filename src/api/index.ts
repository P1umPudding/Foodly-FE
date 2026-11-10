import { SocketClient } from './socket'
import { rest, collectPages } from './rest'
import * as session from './auth'
import type { AuthListener, AuthSession } from './auth'
import { resetTagIconCache } from './assets'
import { previewToRecipe } from './adapters'
import { isStubbed, mergeMyRating, setStubUser, sortByRating, writeMyRating } from './stubs'
import { assertRating } from './views'
import { afterSave, allPendingSaves, pendingSaveFor } from './pendingSaves'
import { PAGE_SIZE } from '../list/query'
import type {
  CreateRecipe,
  Ingredient,
  PaginatedRecipes,
  PaginatedResponse,
  Recipe,
  RecipeId,
  RecipePreview,
  RecipeSearchQuery,
  Tag,
  UploadedImage,
  User,
  UserCategory,
} from './protocol'

const WS_URL = import.meta.env.VITE_WS_URL ?? ''
const USE_MOCKS = import.meta.env.VITE_MOCK === '1'

export const socket = new SocketClient(WS_URL)
export { type SocketStatus } from './socket'

// The mock responder is attached in BOTH modes: with VITE_MOCK=1 every request
// goes to it; in REST mode only listUsers does (see below). No WebSocket is
// opened — that's for the future live editing.
export async function bootstrap(): Promise<void> {
  const { mockRequest } = await import('../mocks')
  socket.useMocks(mockRequest)
}

// Mock mode is always signed in as the mock user (CURRENT_USER_ID in src/mocks, not imported because the
// mocks load lazily). Constant, so session() keeps its identity like the REST snapshot.
const MOCK_SESSION: AuthSession = { userId: 1 }

// The next user must not inherit the last one's stub data or icons that failed with 401. Also on expiry,
// on sign-out in another tab and on a direct switch to another user, which don't go through auth.signOut.
function resetSessionCaches(): void {
  resetTagIconCache()
  setStubUser(null)
}
if (!USE_MOCKS) {
  let cachesFor = session.session()?.userId ?? null
  session.subscribe((current, event) => {
    const userId = current?.userId ?? null
    if (event || userId !== cachesFor) resetSessionCaches()
    cachesFor = userId
  })
}

const auth = {
  session: (): AuthSession | null => (USE_MOCKS ? MOCK_SESSION : session.session()),
  subscribe: (listener: AuthListener): (() => void) => (USE_MOCKS ? () => {} : session.subscribe(listener)),
  signIn: (email: string, password: string): Promise<AuthSession> =>
    USE_MOCKS ? Promise.resolve(MOCK_SESSION) : session.signIn(email, password),
  signUp: (name: string, email: string, password: string): Promise<AuthSession> =>
    USE_MOCKS ? Promise.resolve(MOCK_SESSION) : session.signUp(name, email, password),
  // Caches go first, so listeners reacting to the sign-out already see them empty (the subscription
  // above resets them once more; harmless).
  signOut: (): Promise<void> => {
    if (USE_MOCKS) return Promise.resolve()
    resetSessionCaches()
    return session.signOut()
  },
}

// Reads and writes go over REST; with VITE_MOCK=1 (opt-in; Skaile preview default)
// everything goes through the socket's mock responder instead.
//
// `listUsers` stays mocked: the backend offers only typeahead /users/search
// (no list-all, no /users/{id}), which can't back the bulk byId map that
// CatalogProvider uses to resolve owner/editor names.
export const foodly = {
  auth,
  me: (): Promise<User> =>
    USE_MOCKS
      ? socket.request<User>('me')
      : rest.get<User>('/users/me').then(
          (user) => {
            setStubUser(user?.id ?? null)
            return user
          },
          (error: unknown) => {
            setStubUser(null)
            throw error
          },
        ),
  listUsers: () => socket.request<User[]>('users.list'),
  listCategories: (): Promise<UserCategory[]> =>
    USE_MOCKS
      ? socket.request<UserCategory[]>('categories.list')
      : collectPages((page) => rest.get<PaginatedResponse<UserCategory>>(`/categories?page=${page}&limit=100`)),

  // Reads wait for an editor save still in flight (see pendingSaves.ts).
  searchRecipes: (query: RecipeSearchQuery, page: number): Promise<PaginatedRecipes> =>
    afterSave(allPendingSaves(), () =>
      USE_MOCKS
        ? socket.request<PaginatedRecipes>('recipes.search', { query, page })
        : rest
            .post<PaginatedResponse<RecipePreview>>(`/recipes/search?page=${page}&limit=${PAGE_SIZE}`, query)
            .then((res) => ({ items: res.data.map(previewToRecipe), cursor: res.cursor ? Number(res.cursor) : null }))
            .then((page) => (isStubbed('ratings') ? withStubRatings(page, query) : page)),
    ),

  getRecipe: (id: RecipeId): Promise<Recipe> =>
    afterSave(pendingSaveFor(id), () =>
      USE_MOCKS
        ? socket.request<Recipe>('recipes.get', { id })
        : rest.get<Recipe>(`/recipes/${id}`).then((r) => (isStubbed('ratings') ? mergeMyRating(r) : r)),
    ),

  // REST branch is a localStorage stub until Backend #11 routes ratings
  // (PUT|DELETE /recipes/{id}/ratings/me); it resolves to the re-merged recipe.
  setMyRating: (id: RecipeId, rating: number): Promise<Recipe> =>
    USE_MOCKS
      ? socket.request<Recipe>('ratings.set', { id, rating })
      : Promise.resolve().then(() => {
          assertRating(rating)
          writeMyRating(id, rating)
          return refetchAfterStubWrite(id)
        }),

  clearMyRating: (id: RecipeId): Promise<Recipe> =>
    USE_MOCKS
      ? socket.request<Recipe>('ratings.clear', { id })
      : Promise.resolve().then(() => {
          writeMyRating(id, null)
          return refetchAfterStubWrite(id)
        }),

  copyRecipe: (id: RecipeId): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.copy', { id }) : rest.post<Recipe>(`/recipes/${id}/copy`),

  deleteRecipe: (id: RecipeId): Promise<void> =>
    USE_MOCKS ? socket.request<void>('recipes.delete', { id }) : rest.del(`/recipes/${id}`),

  listTags: (): Promise<Tag[]> =>
    USE_MOCKS ? socket.request<Tag[]>('tags.list') : rest.get<PaginatedResponse<Tag>>('/tags').then((r) => r.data),

  listIngredients: (): Promise<Ingredient[]> =>
    USE_MOCKS
      ? socket.request<Ingredient[]>('ingredients.list')
      : rest.get<PaginatedResponse<Ingredient>>('/ingredients').then((r) => r.data),

  createRecipe: (input: CreateRecipe): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.create', { input }) : rest.post<Recipe>('/recipes', input),

  updateRecipe: (id: RecipeId, input: CreateRecipe): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.update', { id, input }) : rest.put<Recipe>(`/recipes/${id}`, input),

  uploadImage: (file: Blob): Promise<UploadedImage> =>
    USE_MOCKS ? socket.request<UploadedImage>('images.upload') : rest.postBinary<UploadedImage>('/images', file),
}

// The write already landed in localStorage; a failed refetch must not read as
// a failed save.
function refetchAfterStubWrite(id: RecipeId): Promise<Recipe> {
  return foodly.getRecipe(id).catch(() => {
    throw new Error('Gespeichert – die Anzeige aktualisiert sich nach dem Neuladen')
  })
}

function withStubRatings(page: PaginatedRecipes, query: RecipeSearchQuery): PaginatedRecipes {
  const items = page.items.map(mergeMyRating)
  return { ...page, items: query.sort?.field === 'rating' ? sortByRating(items, query.sort.order) : items }
}

// listUsers is mock data in REST too, and real user ids are small numbers that could match a mock
// user — so names like "von Mara" are only trustworthy where the whole app runs on mocks.
export function knowsUserNames(): boolean {
  return USE_MOCKS
}

export type { PaginatedRecipes } from './protocol'
export type { AuthEvent, AuthListener, AuthSession, SignedOutReason } from './auth'
export { ApiError } from './http'
