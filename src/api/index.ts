import { SocketClient } from './socket';
import type {
  Ingredient,
  Recipe,
  RecipeId,
  Tag,
  User,
  UserCategory,
} from './protocol';

const WS_URL = import.meta.env.VITE_WS_URL ?? '';

// VITE_MOCK=1 serves local fixtures. Statically false in prod, so the dynamic
// import in bootstrap() (and all of src/mocks) is dropped from the build.
const USE_MOCKS = import.meta.env.VITE_MOCK === '1';

export const socket = new SocketClient(WS_URL);
export { type SocketStatus } from './socket';

export async function bootstrap(): Promise<void> {
  if (USE_MOCKS) {
    const { mockRequest } = await import('../mocks');
    socket.useMocks(mockRequest);
    return;
  }
  socket.connect();
}

// Message `type` strings are placeholders — align with the real backend (the
// mock responder in src/mocks matches these strings).
export const foodly = {
  me: () => socket.request<User>('me'),

  listRecipes: () => socket.request<Recipe[]>('recipes.list'),
  getRecipe: (id: RecipeId) => socket.request<Recipe>('recipes.get', { id }),

  listCategories: () => socket.request<UserCategory[]>('categories.list'),
  listTags: () => socket.request<Tag[]>('tags.list'),
  listIngredients: () => socket.request<Ingredient[]>('ingredients.list'),
  listUsers: () => socket.request<User[]>('users.list'),
};
