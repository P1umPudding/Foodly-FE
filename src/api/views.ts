// Frontend-only view helpers at the API boundary — the counterpart to
// protocol.ts. Pure functions turning DTOs into display-ready shapes; no React,
// no I/O.

import type { Recipe, RecipeIngredient, UserId } from './protocol'

export type Role = 'owner' | 'editor' | 'viewer' | 'other'

export function roleOf(recipe: Recipe, user: UserId): Role {
  return user === recipe.owner
    ? 'owner'
    : recipe.editors.includes(user)
      ? 'editor'
      : recipe.viewers.includes(user)
        ? 'viewer'
        : 'other'
}

export function myRole(recipe: Recipe, currentUserId: UserId | null): Role {
  return currentUserId === null ? 'other' : roleOf(recipe, currentUserId)
}

export type Collaboration = 'private' | 'shared' | 'collaborative'

export function collaborationState(recipe: Recipe): Collaboration {
  if (recipe.editors.length > 0) return 'collaborative'
  if (recipe.viewers.length > 0) return 'shared'
  return 'private'
}

// null (not 0) when there are no ratings, so the UI can omit the stars.
export function averageRating(recipe: Recipe): number | null {
  const ratings = recipe.rating
  if (ratings.length === 0) return null
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / ratings.length) * 10) / 10
}

// The rating visible to the current user, accounting for collaboration mode.
// Private/Shared: shows only the current user's own rating (null if not rated).
// Collaborative: shows the pooled average of all ratings.
export function visibleRating(recipe: Recipe, currentUserId: UserId | null): number | null {
  if (collaborationState(recipe) === 'collaborative') return averageRating(recipe)
  if (currentUserId === null) return null
  const own = recipe.rating.find((rt) => rt.user === currentUserId)
  return own ? own.rating : null
}

// Compose one ingredient line: "amountPrefix amount unit name/text".
export function formatIngredient(line: RecipeIngredient): string {
  const quantity = [line.amountPrefix, line.amount, line.unit].filter((part): part is string => Boolean(part)).join(' ')

  // With an ingredient, `text` is a suffix rendered after the name; without
  // one, `text` carries the whole free-text line.
  const name = line.ingredient ? [line.ingredient.name, line.text].filter(Boolean).join(' ') : (line.text ?? '')

  return [quantity, name].filter(Boolean).join(' ').trim()
}

// Split an ingredient into its two display columns: quantity (amountPrefix +
// amount + unit) and name (ingredient name + suffix, or free text). Same pieces
// as formatIngredient, kept separate for the two-column layout.
export function ingredientParts(line: RecipeIngredient): { quantity: string; name: string } {
  const quantity = [line.amountPrefix, line.amount, line.unit].filter((part): part is string => Boolean(part)).join(' ')
  const name = line.ingredient ? [line.ingredient.name, line.text].filter(Boolean).join(' ') : (line.text ?? '')
  return { quantity, name }
}

// No time/portion formatters here on purpose: `recipe.time` is shown as-is,
// minutes are filter-only, and {tag} substitution is a render-time concern
// (the phase-1 tag renderer), not a string helper.

export type RatedRole = Role // back-compat alias for existing imports

const ROLE_ORDER: Record<Role, number> = { owner: 0, editor: 1, viewer: 2, other: 3 }

// A rater's role is derived from the recipe itself (owner/editors/viewers), not
// from any user catalog — so this stays a pure DTO function.
export function ratingsByRole(recipe: Recipe): { user: UserId; rating: number; role: Role }[] {
  return recipe.rating
    .map((rt) => ({ user: rt.user, rating: rt.rating, role: roleOf(recipe, rt.user) }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.rating - a.rating)
}
