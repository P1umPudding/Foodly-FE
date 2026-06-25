// Frontend-only view helpers at the API boundary — the counterpart to
// protocol.ts. Pure functions turning DTOs into display-ready shapes; no React,
// no I/O.

import type { Recipe, RecipeIngredient, UserId } from './protocol'

// null (not 0) when there are no ratings, so the UI can omit the stars.
export function averageRating(recipe: Recipe): number | null {
  const ratings = recipe.rating
  if (ratings.length === 0) return null
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / ratings.length) * 10) / 10
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

export type RatedRole = 'owner' | 'editor' | 'viewer' | 'other'

const ROLE_ORDER: Record<RatedRole, number> = { owner: 0, editor: 1, viewer: 2, other: 3 }

// A rater's role is derived from the recipe itself (owner/editors/viewers), not
// from any user catalog — so this stays a pure DTO function.
export function ratingsByRole(recipe: Recipe): { user: UserId; rating: number; role: RatedRole }[] {
  const roleOf = (u: UserId): RatedRole =>
    u === recipe.owner
      ? 'owner'
      : recipe.editors.includes(u)
        ? 'editor'
        : recipe.viewers.includes(u)
          ? 'viewer'
          : 'other'

  return recipe.rating
    .map((r) => ({ user: r.user, rating: r.rating, role: roleOf(r.user) }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.rating - a.rating)
}
