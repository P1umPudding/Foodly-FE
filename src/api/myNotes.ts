// Personal notes (stub storage, no backend endpoint yet, follow-up #360). Own module so src/api/index.ts can load it
// on demand and keep it out of the entry chunk.

import { isRecord, stubStore, stubUserId } from './stubs'
import type { RecipeId, UserId } from './protocol'

// Private per user and recipe, stored as
// { [userId]: { [recipeId]: text } }. Empty or whitespace-only removes the entry.

export const MY_NOTE_MAX = 5000

const MY_NOTES_KEY = 'myNotes'

export function readNote(user: UserId, recipeId: RecipeId): string {
  const mine = stubStore.read<Record<string, unknown>>(MY_NOTES_KEY, {})[user]
  const value = isRecord(mine) ? mine[recipeId] : undefined
  return typeof value === 'string' ? value : ''
}

export function writeNote(user: UserId, recipeId: RecipeId, text: string): void {
  const store = stubStore.read<Record<string, unknown>>(MY_NOTES_KEY, {})
  const stored = store[user]
  const mine = isRecord(stored) ? { ...stored } : {}
  if (text.trim() === '') delete mine[recipeId]
  else mine[recipeId] = text.slice(0, MY_NOTE_MAX)
  stubStore.write(MY_NOTES_KEY, { ...store, [user]: mine })
}

export function readMyNote(recipeId: RecipeId): string {
  const user = stubUserId()
  return user === null ? '' : readNote(user, recipeId)
}

export function writeMyNote(recipeId: RecipeId, text: string): void {
  const user = stubUserId()
  if (user === null) throw new Error('Nicht angemeldet')
  writeNote(user, recipeId, text)
}
