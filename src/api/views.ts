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

// Access control: a recipe is visible only to a user who owns it or is an
// editor/viewer on it. The backend should already scope this, but the list
// guards too so another user's private (or only-shared-with-others) recipe is
// never rendered. No current user → nothing is viewable.
export function canViewRecipe(recipe: Recipe, currentUserId: UserId | null): boolean {
  return myRole(recipe, currentUserId) !== 'other'
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

// Whole stars only; shared by the mock responder and the REST stub so both
// reject the same inputs.
export function assertRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error('Bewertung muss eine ganze Zahl von 1 bis 5 sein')
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

// Fixed German notation (design.md §8); no Intl, locale switching is a non-goal.
export function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',')
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

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅐': 1 / 7,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
  '⅑': 1 / 9,
  '⅒': 1 / 10,
}
// German thousands dot ("1.000", "12.500,5"), decision on #85. A leading 0 or a
// group that is not exactly three digits stays decimal ("0.250", "1.0000").
const THOUSANDS = /^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/
const DECIMAL = /^(\d+([.,]\d*)?|[.,]\d+)$/
const SLASH_FRACTION = /^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/
const UNICODE_FRACTION = new RegExp(`^(?:(\\d+)\\s*)?([${Object.keys(UNICODE_FRACTIONS).join('')}])$`)
// Lazy left side, so the separator keeps the input's spacing. No negative
// amounts: a leading dash leaves the left side empty, so "-2" is rejected.
const RANGE = /^(.+?)(\s*[-–]\s*)(.+)$/

function parseQuantity(s: string): number | null {
  const t = s.trim()
  if (THOUSANDS.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'))
  if (DECIMAL.test(t)) return Number(t.replace(',', '.'))
  const slash = SLASH_FRACTION.exec(t)
  if (slash) {
    const [, whole, num, den] = slash
    if (Number(den) === 0) return null
    return Number(whole ?? 0) + Number(num) / Number(den)
  }
  const unicode = UNICODE_FRACTION.exec(t)
  if (unicode) return Number(unicode[1] ?? 0) + UNICODE_FRACTIONS[unicode[2]]
  return null
}

// `grouped`: the amount was typed with a thousands dot, so the result keeps one.
// Decided for the whole amount, so both ends of a range format alike.
type ParsedAmount = ({ values: [number] } | { values: [number, number]; separator: string }) & { grouped: boolean }

function parseAmount(amount: string): ParsedAmount | null {
  const t = amount.trim()
  const single = parseQuantity(t)
  if (single !== null) return { values: [single], grouped: THOUSANDS.test(t) }
  const range = RANGE.exec(t)
  if (!range) return null
  const from = parseQuantity(range[1])
  const to = parseQuantity(range[3])
  if (from === null || to === null) return null
  const grouped = THOUSANDS.test(range[1].trim()) || THOUSANDS.test(range[3].trim())
  return { values: [from, to], separator: range[2], grouped }
}

function formatScaled(n: number, grouped: boolean): string {
  const [int, frac] = String(Math.round(n * 100) / 100).split('.')
  const head = grouped ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : int
  return frac === undefined ? head : `${head},${frac}`
}

// Whether `scaleAmount` can scale this amount. Callers use it to flag amounts
// that stay as typed ("etwas") when the portion factor is not 1.
export function isScalableAmount(amount: string | null): boolean {
  return amount !== null && parseAmount(amount) !== null
}

// Scale an ingredient `amount` (number, fraction, mixed number or range) by
// `factor` for portion scaling; prefix and unit live in other fields. The parser
// is strict on purpose: anything it does not recognise comes back unchanged, and
// factor 1 returns the input as typed (no reformatting of "½").
export function scaleAmount(amount: string | null, factor: number): string | null {
  if (amount === null || factor === 1) return amount
  const parsed = parseAmount(amount)
  if (!parsed) return amount
  const [from, to] = parsed.values.map((n) => formatScaled(n * factor, parsed.grouped))
  return 'separator' in parsed ? `${from}${parsed.separator}${to}` : from
}

// Portions mode needs a positive base: old data can carry 0 or a negative count,
// and scaling by it would show Infinity, NaN or negative amounts. Looser than the
// editor's minimum of 1 on purpose: an existing 0.5 still scales correctly.
export function hasPortions(sizeNumber: number | null): boolean {
  return sizeNumber !== null && sizeNumber > 0
}

// List views show the total time from minutes ("45 min", "1 h", "1 h 30 min"); the detail page keeps
// `recipe.time` as written. No minutes → nothing, never the free-text `time` (it can be long, e.g.
// "20 min + Kochzeit 25 min", and would break the one-line meta). {tag} substitution stays a render-time concern.
export function formatMinutes(minutes: number | null): string | null {
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) return null
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const rest = m % 60
  return rest === 0 ? `${Math.floor(m / 60)} h` : `${Math.floor(m / 60)} h ${rest} min`
}

export type RatedRole = Role // back-compat alias for existing imports

const ROLE_ORDER: Record<Role, number> = { owner: 0, editor: 1, viewer: 2, other: 3 }

// A rater's role is derived from the recipe itself (owner/editors/viewers), not
// from any user catalog — so this stays a pure DTO function.
export function ratingsByRole(recipe: Recipe): { user: UserId; rating: number; role: Role }[] {
  return recipe.rating
    .map((rt) => ({ user: rt.user, rating: rt.rating, role: roleOf(recipe, rt.user) }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.rating - a.rating)
}
