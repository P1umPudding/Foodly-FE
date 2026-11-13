// The recipes the user opened last ("Zuletzt angesehen" on the start page): newest first, no duplicates, at most 20.
// Local per user (no backend for it), versioned like src/list/persistence.ts; storage errors are swallowed
// because the list is best-effort.
import type { RecipeId, UserId } from '../api/protocol'

const VERSION = 1
const MAX = 20
const keyFor = (userId: UserId) => `foodly:recently-viewed:${userId}`

const isRecipeId = (x: unknown): x is RecipeId => typeof x === 'number' && Number.isInteger(x) && x > 0

export function readRecentlyViewed(userId: UserId): RecipeId[] {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as { version?: unknown; ids?: unknown } | null
    if (parsed?.version !== VERSION || !Array.isArray(parsed.ids)) return []
    // Hand-edited or foreign values must not break "no duplicates, at most 20" for the writers.
    return [...new Set(parsed.ids.filter(isRecipeId))].slice(0, MAX)
  } catch {
    return []
  }
}

function write(userId: UserId, ids: RecipeId[]): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ version: VERSION, ids }))
  } catch {
    // storage full/blocked → silently skip
  }
}

export function pushRecentlyViewed(userId: UserId, recipeId: RecipeId): void {
  write(userId, [recipeId, ...readRecentlyViewed(userId).filter((id) => id !== recipeId)].slice(0, MAX))
}

// Re-reads instead of taking the caller's copy, so a push from another tab in between isn't lost.
export function removeRecentlyViewed(userId: UserId, ids: Iterable<RecipeId>): void {
  const drop = new Set(ids)
  const current = readRecentlyViewed(userId)
  const next = current.filter((id) => !drop.has(id))
  if (next.length !== current.length) write(userId, next)
}
