// UX only, not a security boundary — the backend 403s regardless.
import type { Recipe, UserId } from '../api/protocol'

export function canEdit(recipe: Recipe, userId: UserId | null): boolean {
  if (userId === null) return false
  return recipe.owner === userId || recipe.editors.includes(userId)
}
