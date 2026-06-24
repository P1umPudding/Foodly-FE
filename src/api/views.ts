// View models & derivations produced at the API boundary — the frontend-only
// counterpart to `protocol.ts` (the wire contract). Pure functions that turn
// raw DTOs into display-ready shapes; no React, no I/O, no id-resolving (after
// the IngredientRef change, recipes render directly from the DTOs — see
// docs/phases/phase-0-datenaufbereitung.md).

import type { Recipe, RecipeIngredient } from './protocol';

/**
 * Average of a recipe's ratings, rounded to one decimal. `null` when the recipe
 * has no ratings yet (so the UI can omit the stars rather than show 0).
 */
export function averageRating(recipe: Recipe): number | null {
  const ratings = recipe.rating;
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/**
 * One ingredient line as a single display string, composed of
 * `amountPrefix amount unit` followed by the ingredient name (or free text).
 *
 *   { amount:"500", unit:"g", ingredient:{name:"Mehl"} }        → "500 g Mehl"
 *   { amountPrefix:"ca.", amount:"800", unit:"g", … "Tomaten" } → "ca. 800 g Tomaten"
 *   { ingredient:{name:"Parmesan"}, text:"zum Servieren" }      → "Parmesan zum Servieren"
 *   { ingredient:null, text:"Salz nach Geschmack" }             → "Salz nach Geschmack"
 */
export function formatIngredient(line: RecipeIngredient): string {
  const quantity = [line.amountPrefix, line.amount, line.unit]
    .filter((part): part is string => Boolean(part))
    .join(' ');

  // With an ingredient, `text` is a suffix rendered after the name; without
  // one, `text` carries the whole free-text line.
  const name = line.ingredient
    ? [line.ingredient.name, line.text].filter(Boolean).join(' ')
    : (line.text ?? '');

  return [quantity, name].filter(Boolean).join(' ').trim();
}

/**
 * Portion/amount string with the protocol's `{unit}` braces stripped for
 * display: "4 {Portionen}" → "4 Portionen", "26 cm {Springform}" → "26 cm
 * Springform". `null` passes through (nothing to show).
 */
export function formatPortions(amount: string | null): string | null {
  if (!amount) return null;
  const cleaned = amount.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

/**
 * Human-readable duration from minutes: 45 → "45 min", 70 → "1 h 10 min",
 * 120 → "2 h". `null` passes through.
 */
export function formatMinutes(minutes: number | null): string | null {
  if (minutes == null) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
