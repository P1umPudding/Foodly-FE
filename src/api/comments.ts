// Public recipe comments (stub storage, no backend endpoint yet, follow-up issue linked in docs/plan.md). Own module
// so src/api/index.ts loads it on demand and keeps it out of the entry chunk. All users share one key, so in REST
// mode a browser only shows the comments written in it.

import { isRecord, stubStore, stubUserId } from './stubs'
import type { RecipeId, UserId } from './protocol'

export type RecipeComment = { id: string; user: UserId; createdAt: string; text: string }

export const COMMENT_MAX = 2000

// { [recipeId]: RecipeComment[] }. A recipe whose comments were all deleted keeps `[]`, so the mock doesn't re-seed it.
const COMMENTS_KEY = 'comments'

type CommentStore = Record<string, unknown>

function isComment(value: unknown): value is RecipeComment {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.user === 'number' &&
    typeof value.createdAt === 'string' &&
    typeof value.text === 'string'
  )
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}-${Math.random()}`
}

function stored(store: CommentStore, recipeId: RecipeId): RecipeComment[] {
  const list = store[recipeId]
  return Array.isArray(list) ? list.filter(isComment) : []
}

export function hasCommentEntry(recipeId: RecipeId): boolean {
  return Array.isArray(stubStore.read<CommentStore>(COMMENTS_KEY, {})[recipeId])
}

// Oldest first, so the newest sits at the bottom next to the input.
export function readComments(recipeId: RecipeId): RecipeComment[] {
  return stored(stubStore.read<CommentStore>(COMMENTS_KEY, {}), recipeId).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
}

export function writeComments(recipeId: RecipeId, comments: RecipeComment[]): void {
  const store = stubStore.read<CommentStore>(COMMENTS_KEY, {})
  stubStore.write(COMMENTS_KEY, { ...store, [recipeId]: comments })
}

export function addCommentAs(user: UserId, recipeId: RecipeId, text: string, now = new Date()): RecipeComment {
  const trimmed = text.trim()
  if (trimmed === '') throw new Error('Kommentar ist leer')
  const comment = { id: newId(), user, createdAt: now.toISOString(), text: trimmed.slice(0, COMMENT_MAX) }
  writeComments(recipeId, [...readComments(recipeId), comment])
  return comment
}

// The recipe owner may delete any comment, everyone else only their own. In REST mode the owner comes from the
// client; it's a local stub, the backend will have to enforce this itself.
export function deleteCommentAs(user: UserId, recipeId: RecipeId, commentId: string, recipeOwner: UserId): void {
  const comments = readComments(recipeId)
  const target = comments.find((c) => c.id === commentId)
  if (!target) return
  if (target.user !== user && recipeOwner !== user) throw new Error('Nicht erlaubt')
  writeComments(
    recipeId,
    comments.filter((c) => c.id !== commentId),
  )
}

function me(): UserId {
  const user = stubUserId()
  if (user === null) throw new Error('Nicht angemeldet')
  return user
}

export const addMyComment = (recipeId: RecipeId, text: string) => addCommentAs(me(), recipeId, text)
export const deleteMyComment = (recipeId: RecipeId, commentId: string, recipeOwner: UserId) =>
  deleteCommentAs(me(), recipeId, commentId, recipeOwner)
