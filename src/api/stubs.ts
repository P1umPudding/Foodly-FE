// Stubs for backend gaps in REST mode (Alpha, docs/decisions/0003-backend-gap-stubs.md).
// Stub data lives in localStorage under `foodly.stub.`, keyed by real backend ids.
// With VITE_MOCK=1 nothing is stubbed: the mock responder serves everything.

import { averageRating } from './views'
import type { Recipe, RecipeId, SortOrder, UserId } from './protocol'

// Mirrors the ADR §3 list; extend as further gaps get stubbed.
export type StubFeature = 'ratings' | 'sharing' | 'groups' | 'addedAt' | 'images'

const USE_MOCKS = import.meta.env.VITE_MOCK === '1'

export const STUBBED: ReadonlySet<StubFeature> = new Set<StubFeature>(USE_MOCKS ? [] : ['ratings', 'images'])

export function isStubbed(feature: StubFeature): boolean {
  return STUBBED.has(feature)
}

const PREFIX = 'foodly.stub.'

// Corrupt JSON or a blocked localStorage reads as `fallback`: stub data is
// disposable Alpha state, never worth an error screen.
export const stubStore = {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw === null ? fallback : (JSON.parse(raw) as T)
    } catch {
      return fallback
    }
  },
  write(key: string, value: unknown): void {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  },
}

// `me` otherwise only lives in React (CatalogProvider), but stubs must stay in
// src/api (ADR §1), so foodly.me() records the id here. CatalogProvider renders
// nothing before me() settles, so recipe reads always see it in the app.
let currentUserId: UserId | null = null

export function setStubUser(id: UserId | null): void {
  currentUserId = id
}

export function stubUserId(): UserId | null {
  return currentUserId
}

// --- Ratings (Backend #11: ratings are not routed yet, REST `rating[]` is always
// empty). Future endpoint: PUT|DELETE /recipes/{id}/ratings/me
// (docs/backend-questions.md). Stored as { [userId]: { [recipeId]: rating } }.

type RatingStore = Record<string, Record<string, number>>

const RATINGS_KEY = 'ratings'

export function readMyRating(recipeId: RecipeId): number | null {
  if (currentUserId === null) return null
  return stubStore.read<RatingStore>(RATINGS_KEY, {})[currentUserId]?.[recipeId] ?? null
}

export function writeMyRating(recipeId: RecipeId, rating: number | null): void {
  if (currentUserId === null) throw new Error('Nicht angemeldet')
  const store = stubStore.read<RatingStore>(RATINGS_KEY, {})
  const mine = { ...store[currentUserId] }
  if (rating === null) delete mine[recipeId]
  else mine[recipeId] = rating
  stubStore.write(RATINGS_KEY, { ...store, [currentUserId]: mine })
}

// Replaces (not appends) the own entry, so this stays correct once the backend
// starts returning ratings itself.
export function mergeMyRating<R extends Pick<Recipe, 'id' | 'rating'>>(recipe: R): R {
  const user = currentUserId
  const mine = readMyRating(recipe.id)
  if (user === null || mine === null) return recipe
  return { ...recipe, rating: [...recipe.rating.filter((r) => r.user !== user), { user, rating: mine }] }
}

// The server sorts without stub ratings, so a rating sort is redone per page on
// the client. Same key as the mock (averageRating); unrated last in both
// directions. Order across page boundaries stays the server's.
export function sortByRating(recipes: Recipe[], order: SortOrder): Recipe[] {
  const dir = order === 'asc' ? 1 : -1
  return [...recipes].sort((a, b) => {
    const va = averageRating(a)
    const vb = averageRating(b)
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    return (va - vb) * dir
  })
}
