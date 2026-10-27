import { SocketClient } from './socket'
import { rest, collectPages } from './rest'
import { previewToRecipe } from './adapters'
import { PAGE_SIZE } from '../list/query'
import type {
  Ingredient,
  PaginatedRecipes,
  PaginatedResponse,
  Recipe,
  RecipeId,
  RecipePreview,
  RecipeSearchQuery,
  Tag,
  User,
  UserCategory,
} from './protocol'

const WS_URL = import.meta.env.VITE_WS_URL ?? ''
const USE_MOCKS = import.meta.env.VITE_MOCK === '1'

export const socket = new SocketClient(WS_URL)
export { type SocketStatus } from './socket'

// The mock responder is attached in BOTH modes: in mock mode it answers
// everything; in REST mode it answers only me/users/categories (no backend yet).
// The real WS connection (for future live editing) is not established here.
export async function bootstrap(): Promise<void> {
  const { mockRequest } = await import('../mocks')
  socket.useMocks(mockRequest)
}

// Reads with a real backend go over REST; the still-mocked reads go through the
// socket's mock responder. In VITE_MOCK dev, everything goes through the mock.
//
// `listUsers` stays mocked: the backend offers only typeahead /users/search
// (no list-all, no /users/{id}), which can't back the bulk byId map that
// CatalogProvider uses to resolve owner/editor names.
export const foodly = {
  me: (): Promise<User> => (USE_MOCKS ? socket.request<User>('me') : rest.get<User>('/users/me')),
  listUsers: () => socket.request<User[]>('users.list'),
  listCategories: (): Promise<UserCategory[]> =>
    USE_MOCKS
      ? socket.request<UserCategory[]>('categories.list')
      : collectPages((page) => rest.get<PaginatedResponse<UserCategory>>(`/categories?page=${page}&limit=100`)),

  searchRecipes: (query: RecipeSearchQuery, page: number): Promise<PaginatedRecipes> =>
    USE_MOCKS
      ? socket.request<PaginatedRecipes>('recipes.search', { query, page })
      : rest
          .post<PaginatedResponse<RecipePreview>>(`/recipes/search?page=${page}&limit=${PAGE_SIZE}`, query)
          .then((res) => ({ items: res.data.map(previewToRecipe), cursor: res.cursor ? Number(res.cursor) : null })),

  getRecipe: (id: RecipeId): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.get', { id }) : rest.get<Recipe>(`/recipes/${id}`),

  copyRecipe: (id: RecipeId): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.copy', { id }) : rest.post<Recipe>(`/recipes/${id}/copy`),

  listTags: (): Promise<Tag[]> =>
    USE_MOCKS ? socket.request<Tag[]>('tags.list') : rest.get<PaginatedResponse<Tag>>('/tags').then((r) => r.data),

  listIngredients: (): Promise<Ingredient[]> =>
    USE_MOCKS
      ? socket.request<Ingredient[]>('ingredients.list')
      : rest.get<PaginatedResponse<Ingredient>>('/ingredients').then((r) => r.data),
}

export type { PaginatedRecipes } from './protocol'
