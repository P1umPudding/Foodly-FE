import { SocketClient } from './socket'
import { rest, collectPages } from './rest'
import { previewToRecipe } from './adapters'
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

// Reads and writes go over REST; with VITE_MOCK=1 (opt-in; Skaile preview default)
// everything goes through the socket's mock responder instead.
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

  createRecipe: (input: CreateRecipe): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.create', { input }) : rest.post<Recipe>('/recipes', input),

  updateRecipe: (id: RecipeId, input: CreateRecipe): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.update', { id, input }) : rest.put<Recipe>(`/recipes/${id}`, input),

  uploadImage: (file: Blob): Promise<UploadedImage> =>
    USE_MOCKS ? socket.request<UploadedImage>('images.upload') : rest.postBinary<UploadedImage>('/images', file),
}

export type { PaginatedRecipes } from './protocol'
