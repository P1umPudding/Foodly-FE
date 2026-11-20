// The editor's working copy of a recipe. Deliberately NOT the wire shape:
//
//  - every row carries a client-side `key` instead of a server id, because
//    PUT /recipes/{id} deletes and re-inserts nested rows — server ids change on
//    every save, so they cannot identify a row the user is editing;
//  - `sizeMode` makes the sizeNumber/sizeText either-or explicit rather than
//    leaving the UI to infer it from nulls;
//  - text fields are '' rather than null, so inputs stay controlled.

import { joinAmount, splitAmount } from './amount'
import type { CreateRecipe, ImageRef, IngredientId, Recipe, TagId } from '../api/protocol'

export type DraftIngredient = {
  key: number
  ingredient: IngredientId | null // catalog hit …
  text: string // … or free text; at least one must be set to survive the save
  amount: string // prefix included ("ca. 800"), split again on save
  unit: string
}

export type DraftStep = { key: number; text: string }
export type DraftNote = { key: number; text: string }

export type DraftSection = {
  key: number
  name: string
  ingredients: DraftIngredient[]
  steps: DraftStep[]
}

export type SizeMode = 'portions' | 'text'

export type Draft = {
  name: string
  source: string
  workMinutes: number | null
  overallMinutes: number | null
  sizeMode: SizeMode
  sizeNumber: number | null
  sizeText: string
  tags: TagId[]
  notes: DraftNote[]
  mainImage: ImageRef | null
  images: ImageRef[]
  sections: DraftSection[]
  // Never edited, but kept: PUT is a full replace, so dropping it would wipe the
  // string, and the detail page still falls back to it for old recipes without
  // workMinutes/overallMinutes.
  time: string | null
}

let counter = 0
const nextKey = () => ++counter

export function newIngredient(): DraftIngredient {
  return { key: nextKey(), ingredient: null, text: '', amount: '', unit: '' }
}

export function newStep(): DraftStep {
  return { key: nextKey(), text: '' }
}

export function newNote(): DraftNote {
  return { key: nextKey(), text: '' }
}

export function newSection(): DraftSection {
  return { key: nextKey(), name: '', ingredients: [newIngredient()], steps: [newStep()] }
}

export function emptyDraft(): Draft {
  return {
    name: '',
    source: '',
    workMinutes: null,
    overallMinutes: null,
    sizeMode: 'portions',
    sizeNumber: null,
    sizeText: '',
    tags: [],
    notes: [],
    mainImage: null,
    images: [],
    sections: [newSection()],
    time: null,
  }
}

export function toDraft(recipe: Recipe): Draft {
  return {
    name: recipe.name,
    source: recipe.source ?? '',
    workMinutes: recipe.workMinutes,
    overallMinutes: recipe.overallMinutes,
    sizeMode: recipe.sizeNumber !== null ? 'portions' : 'text',
    sizeNumber: recipe.sizeNumber,
    sizeText: recipe.sizeText ?? '',
    tags: [...recipe.tags],
    notes: recipe.notes.map((text) => ({ key: nextKey(), text })),
    mainImage: recipe.mainImage,
    images: [...recipe.images],
    time: recipe.time,
    sections: recipe.sections.map((section) => ({
      key: nextKey(),
      name: section.name ?? '',
      steps: section.steps.map((text) => ({ key: nextKey(), text })),
      ingredients: section.ingredients.map((line) => ({
        key: nextKey(),
        ingredient: line.ingredient?.id ?? null,
        text: line.text ?? '',
        amount: joinAmount(line.amountPrefix ?? '', line.amount ?? ''),
        unit: line.unit ?? '',
      })),
    })),
  }
}

// Empty stays allowed (no size given); text mode drops the number on save anyway.
export function sizeNumberError(draft: Pick<Draft, 'sizeMode' | 'sizeNumber'>): string | null {
  const n = draft.sizeNumber
  if (draft.sizeMode !== 'portions' || n === null) return null
  return !Number.isFinite(n) || n < 1 ? 'Mindestens 1 Portion.' : null
}

const orNull = (s: string): string | null => (s.trim() === '' ? null : s.trim())

export function toCreateRecipe(draft: Draft): CreateRecipe {
  return {
    name: draft.name.trim(),
    tags: draft.tags,
    source: orNull(draft.source),
    time: draft.time,
    workMinutes: draft.workMinutes,
    overallMinutes: draft.overallMinutes,
    sizeNumber: draft.sizeMode === 'portions' ? draft.sizeNumber : null,
    sizeText: orNull(draft.sizeText),
    notes: draft.notes.map((n) => n.text.trim()).filter((t) => t !== ''),
    mainImage: draft.mainImage?.id ?? null,
    images: draft.images.map((image) => image.id),
    sections: draft.sections.map((section) => ({
      name: orNull(section.name),
      steps: section.steps.map((s) => s.text.trim()).filter((t) => t !== ''),
      // A row with neither an ingredient nor text is a 422 server-side; an empty
      // trailing row is normal while typing, so drop it instead of failing.
      ingredients: section.ingredients
        .filter((line) => line.ingredient !== null || line.text.trim() !== '')
        .map((line) => {
          const { amountPrefix, amount } = splitAmount(line.amount)
          return {
            ingredient: line.ingredient,
            text: orNull(line.text),
            amount: orNull(amount),
            amountPrefix: orNull(amountPrefix),
            unit: orNull(line.unit),
          }
        }),
    })),
  }
}

export function move<T extends { key: number }>(rows: T[], key: number, delta: -1 | 1): T[] {
  const from = rows.findIndex((r) => r.key === key)
  const to = from + delta
  if (from === -1 || to < 0 || to >= rows.length) return rows
  const next = [...rows]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

export const isBlank = (line: DraftIngredient) =>
  line.ingredient === null && [line.text, line.amount, line.unit].every((v) => v.trim() === '')

// The phone's reading row (#217), split like `ingredientParts` for the detail page. `amount` already carries the prefix
// ("ca. 800"), so it is not joined with one again. On a catalog row `text` is the Zusatz, on a free-text row the name.
export function draftLineParts(
  line: DraftIngredient,
  byId: Record<IngredientId, { name: string } | undefined>,
): { quantity: string; name: string; extra: string } {
  const quantity = [line.amount, line.unit]
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join(' ')
  if (line.ingredient === null) return { quantity, name: line.text.trim(), extra: '' }
  return { quantity, name: byId[line.ingredient]?.name ?? '', extra: line.text.trim() }
}

// "Mehrere einfügen": the empty placeholder row a new section starts with is replaced, not left above the pasted rows.
export function appendIngredients(rows: DraftIngredient[], added: Omit<DraftIngredient, 'key'>[]): DraftIngredient[] {
  let end = rows.length
  while (end > 0 && isBlank(rows[end - 1])) end--
  return [...rows.slice(0, end), ...added.map((line) => ({ ...newIngredient(), ...line }))]
}

// Applied to the current draft per finished upload, so a batch of uploads (or an edit made meanwhile) never works
// from a stale copy: the first image becomes the main one while there is none.
export function addImage<T extends Pick<Draft, 'mainImage' | 'images'>>(draft: T, image: ImageRef): T {
  return draft.mainImage === null ? { ...draft, mainImage: image } : { ...draft, images: [...draft.images, image] }
}
