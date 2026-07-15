// The editor's working copy of a recipe. Deliberately NOT the wire shape:
//
//  - every row carries a client-side `key` instead of a server id, because
//    PUT /recipes/{id} deletes and re-inserts nested rows — server ids change on
//    every save, so they cannot identify a row the user is editing;
//  - `sizeMode` makes the sizeNumber/sizeText either-or explicit rather than
//    leaving the UI to infer it from nulls;
//  - text fields are '' rather than null, so inputs stay controlled.

import type { CreateRecipe, ImageId, IngredientId, Recipe, TagId } from '../api/protocol'

export type DraftIngredient = {
  key: number
  ingredient: IngredientId | null // catalog hit …
  text: string // … or free text; at least one must be set to survive the save
  amount: string
  amountPrefix: string
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
  mainImage: ImageId | null
  images: ImageId[]
  sections: DraftSection[]
  // Never edited: the detail page still renders `time`, and PUT is a full
  // replace — dropping it would wipe the string. Goes away once the detail page
  // derives its display from workMinutes/overallMinutes.
  time: string | null
}

let counter = 0
const nextKey = () => ++counter

export function newIngredient(): DraftIngredient {
  return { key: nextKey(), ingredient: null, text: '', amount: '', amountPrefix: '', unit: '' }
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
        amount: line.amount ?? '',
        amountPrefix: line.amountPrefix ?? '',
        unit: line.unit ?? '',
      })),
    })),
  }
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
    mainImage: draft.mainImage,
    images: draft.images,
    sections: draft.sections.map((section) => ({
      name: orNull(section.name),
      steps: section.steps.map((s) => s.text.trim()).filter((t) => t !== ''),
      // A row with neither an ingredient nor text is a 422 server-side; an empty
      // trailing row is normal while typing, so drop it instead of failing.
      ingredients: section.ingredients
        .filter((line) => line.ingredient !== null || line.text.trim() !== '')
        .map((line) => ({
          ingredient: line.ingredient,
          text: orNull(line.text),
          amount: orNull(line.amount),
          amountPrefix: orNull(line.amountPrefix),
          unit: orNull(line.unit),
        })),
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
