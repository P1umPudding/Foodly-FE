// Finds time spans in recipe step text ("ca. 30 Minuten", "5–6 Min.", "1½ Stunden", "eine Viertelstunde") so
// the step can offer them as timer chips. Pure and German-only, like the recipes.
//
// A later `Step.duration` from the backend (B10) takes precedence over this regex: once a step carries its own
// duration, use that and only fall back to parsing for steps without one.

import { tagTokenRanges } from '../components/tagTokens'

export type DurationMatch = { start: number; end: number; durationMs: number; label: string }

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

const NUMBER_WORDS: Record<string, number> = {
  ein: 1,
  eine: 1,
  einen: 1,
  einer: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  fünf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
  elf: 11,
  zwölf: 12,
}
const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75 }

const DIGITS = String.raw`\d+(?:[.,]\d+)?(?:\s?[½¼¾])?`
const WORD = 'einen|einer|eine|ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf'
const RANGE = String.raw`\s*(?:-|–|—|\sbis\s)\s*`
const UNIT = String.raw`(stunden|stunde|std\.?|h|minuten|minute|min\.?|sekunden|sekunde|sek\.?|s)(?![\p{L}\d])`
// Digits may touch the unit ("10min"); number words need a space, or "eins" would read as "ein s".
const QUANTITY =
  String.raw`(?:(?:(${DIGITS})${RANGE})?(${DIGITS})\s?|(?:(${WORD})${RANGE})?(${WORD})\s+)${UNIT}` +
  String.raw`|((?:eine\s+)?halbe\s+stunde|(?:eine\s+)?viertelstunde)(?![\p{L}\d])`
const PREFIX = String.raw`(?:(?:ca\.|etwa|gut)\s+)?`

// No lookbehind for the left word boundary: Safari before 16.4 can't parse it (Vite's default target includes
// Safari 16.0), so the boundary is checked in code instead.
const FIRST = new RegExp(PREFIX + `(?:${QUANTITY})`, 'giu')
// A follow-up part of a combination ("1 Stunde 30 Minuten", "1 Std. und 30 Min."), anchored where the last ended.
const NEXT = new RegExp(String.raw`(?:\s*,)?(?:\s+und)?\s+(?:${QUANTITY})`, 'yiu')

type Quantity = { ms: number; unitMs: number }

function numberValue(raw: string): number {
  const word = NUMBER_WORDS[raw.toLowerCase()]
  if (word !== undefined) return word
  const fraction = raw[raw.length - 1]
  if (fraction in FRACTIONS) {
    const whole = raw.slice(0, -1).trim()
    return (whole === '' ? 0 : Number(whole.replace(',', '.'))) + FRACTIONS[fraction]
  }
  return Number(raw.replace(',', '.'))
}

function unitMs(unit: string): number {
  const u = unit.toLowerCase()
  if (u.startsWith('st') || u === 'h') return HOUR
  if (u.startsWith('m')) return MINUTE
  return SECOND
}

// Ranges ("5–6 Minuten") time the upper value: better to check early than to overcook.
// Capture groups of QUANTITY: [range low, digits, range low word, word, unit, special].
function quantity(groups: string[]): Quantity {
  const [, digits, , word, unit, special] = groups
  if (special !== undefined) {
    const ms = /viertel/i.test(special) ? 15 * MINUTE : 30 * MINUTE
    return { ms, unitMs: HOUR }
  }
  const u = unitMs(unit)
  return { ms: Math.round(numberValue(digits ?? word) * u), unitMs: u }
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\d]/u.test(ch)
}

export function parseDurations(text: string): DurationMatch[] {
  const tokens = tagTokenRanges(text)
  const matches: DurationMatch[] = []
  FIRST.lastIndex = 0

  for (let m = FIRST.exec(text); m !== null; m = FIRST.exec(text)) {
    const start = m.index
    if (isWordChar(text[start - 1])) {
      // Inside a word ("Achtung", "x12 min"): retry one character later, where a shorter match may still start.
      FIRST.lastIndex = start + 1
      continue
    }

    let { ms, unitMs: lastUnit } = quantity(m.slice(1))
    let end = start + m[0].length
    for (;;) {
      NEXT.lastIndex = end
      const n = NEXT.exec(text)
      if (!n) break
      const part = quantity(n.slice(1))
      if (part.unitMs >= lastUnit) break
      ms += part.ms
      lastUnit = part.unitMs
      end += n[0].length
    }
    FIRST.lastIndex = end

    if (ms <= 0) continue
    if (tokens.some((t) => t.start < end && start < t.end)) continue
    matches.push({ start, end, durationMs: ms, label: text.slice(start, end) })
  }
  return matches
}
