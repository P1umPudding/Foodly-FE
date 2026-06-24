import { SocketClient } from './socket';
import type {
  Ingredient,
  Recipe,
  RecipeId,
  Tag,
  User,
  UserCategory,
} from './types';

// Single shared connection to the backend. The URL comes from the environment
// (.env.local → VITE_WS_URL). `main.tsx` calls `bootstrap()` on startup.
const WS_URL = import.meta.env.VITE_WS_URL ?? '';

// Dev convenience: with VITE_MOCK=1 the app serves local fixtures (src/mocks)
// instead of talking to a real backend. Statically false in prod, so the
// dynamic import below is dropped from the build.
const USE_MOCKS = import.meta.env.VITE_MOCK === '1';

export const socket = new SocketClient(WS_URL);
export { type SocketStatus } from './socket';

/** Open the backend connection — or attach the mock responder when mocking. */
export async function bootstrap(): Promise<void> {
  if (USE_MOCKS) {
    const { mockRequest } = await import('../mocks');
    socket.useMocks(mockRequest);
    return;
  }
  socket.connect();
}

// ---------------------------------------------------------------------------
// Typed API surface. Each call is just `socket.request<ReturnType>('type', payload)`.
// The message `type` strings are placeholders — align them with the real
// backend protocol (the mock responder in `src/mocks` matches these strings).
// ---------------------------------------------------------------------------

export const foodly = {
  /** The current user (whoever is "logged in"). */
  me: () => socket.request<User>('me'),

  listRecipes: () => socket.request<Recipe[]>('recipes.list'),
  getRecipe: (id: RecipeId) => socket.request<Recipe>('recipes.get', { id }),

  listCategories: () => socket.request<UserCategory[]>('categories.list'),
  listTags: () => socket.request<Tag[]>('tags.list'),
  listIngredients: () => socket.request<Ingredient[]>('ingredients.list'),
  listUsers: () => socket.request<User[]>('users.list'),
};
