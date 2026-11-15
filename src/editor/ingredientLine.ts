// "Mehrere einfügen" (#249): one pasted line → one draft ingredient. Layout per line: [prefix + number] [unit] [rest],
// the rest becoming a catalog ingredient (+ Zusatz) or free text. Rules agreed in the issue's Clarifications.
import { joinAmount, splitAmount } from './amount'
import { UNITS } from './units'
import type { DraftIngredient } from './draft'
import type { Ingredient } from '../api/protocol'

type CatalogEntry = Pick<Ingredient, 'id' | 'name'>
export type ParsedIngredient = Omit<DraftIngredient, 'key'>

const NUMBER = String.raw`[\p{Nd}\p{No}]+(?:[.,/][\p{Nd}\p{No}]+)*`
// Optional prefix, then a number with an optional mixed fraction ("1 ½") and an optional range ("1-2", "1 – 2").
const HEAD = new RegExp(String.raw`^(?:([^\s\p{Nd}\p{No}]+)\s*)?(${NUMBER}(?:\s+\p{No})?(?:\s*[-–]\s*${NUMBER})?)`, 'u')
const UNIT = /^\s*([^\s,]+)(?=[\s,]|$)/
// Capitalised words before a number are usually the ingredient ("Knoblauch 2 Zehen"), except these. A lower-case noun
// ("eier 3") still passes as prefix: rare enough not to guess further.
const PREFIX_WORDS = ['etwa', 'knapp', 'gut', 'je', 'ca', 'circa', 'max', 'min']

const isPrefix = (word: string) =>
  !/^\p{Lu}/u.test(word) || word.endsWith('.') || PREFIX_WORDS.includes(word.toLowerCase())

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

export function parseIngredientLine(line: string, catalog: readonly CatalogEntry[]): ParsedIngredient {
  let rest = line.trim()
  let amount = ''
  let unit = ''

  const head = HEAD.exec(rest)
  if (head && (head[1] === undefined || isPrefix(head[1]))) {
    // Through splitAmount so the prefix rule stays the one of the Menge field (#232); joinAmount gives the field's
    // spelling ("ca.800" → "ca. 800").
    const { amountPrefix, amount: number } = splitAmount(head[0])
    amount = joinAmount(amountPrefix, number)
    rest = rest.slice(head[0].length)
    const token = UNIT.exec(rest)
    const known = token && UNITS.find((u) => u.toLowerCase() === token[1].toLowerCase())
    if (token && known) {
      unit = known
      rest = rest.slice(token[0].length)
    }
  }

  return { amount, unit, ...matchCatalog(collapse(rest), catalog) }
}

// A catalog row's `text` is its Zusatz; a free-text row's `text` is its name. An empty rest ("500 g") stays a nameless
// free-text row: the user sees it and can add the name, otherwise the save drops it like any nameless row.
function matchCatalog(rest: string, catalog: readonly CatalogEntry[]): Pick<DraftIngredient, 'ingredient' | 'text'> {
  const lower = rest.toLowerCase()
  const entries = catalog.map((entry) => ({ id: entry.id, name: collapse(entry.name).toLowerCase() }))
  const exact = entries.find((entry) => entry.name === lower)
  if (exact) return { ingredient: exact.id, text: '' }
  // Longest first: "Tomaten (gehackt) …" must not link "Tomaten".
  const prefix = entries
    .filter(
      (entry) => entry.name !== '' && lower.startsWith(entry.name) && /^[\s,]/.test(lower.slice(entry.name.length)),
    )
    .sort((a, b) => b.name.length - a.name.length)[0]
  if (prefix) return { ingredient: prefix.id, text: rest.slice(prefix.name.length).replace(/^[\s,]+/, '') }
  return { ingredient: null, text: rest }
}

export function parseIngredientList(text: string, catalog: readonly CatalogEntry[]): ParsedIngredient[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => parseIngredientLine(line, catalog))
}
