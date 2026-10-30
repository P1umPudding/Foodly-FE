import { describe, expect, it } from 'vitest'
import { parseDurations } from './parseDurations'

const MIN = 60_000
const HOUR = 60 * MIN

// [text, expected label, expected duration in ms]
const POSITIVE: Array<[string, string, number]> = [
  ['30 Minuten köcheln', '30 Minuten', 30 * MIN],
  ['1 Minute ruhen', '1 Minute', MIN],
  ['10 Min. quellen', '10 Min.', 10 * MIN],
  ['25 min backen', '25 min', 25 * MIN],
  ['10min ziehen', '10min', 10 * MIN],
  ['2 Stunden schmoren', '2 Stunden', 2 * HOUR],
  ['1 Stunde gehen lassen', '1 Stunde', HOUR],
  ['3 Std. marinieren', '3 Std.', 3 * HOUR],
  ['2 Std marinieren', '2 Std', 2 * HOUR],
  ['2 h kühlen', '2 h', 2 * HOUR],
  ['30 Sekunden mixen', '30 Sekunden', 30_000],
  ['20 Sek. pürieren', '20 Sek.', 20_000],
  ['45 s anbraten', '45 s', 45_000],
  ['ca. 45 Minuten backen', 'ca. 45 Minuten', 45 * MIN],
  ['Etwa 30 Minuten köcheln', 'Etwa 30 Minuten', 30 * MIN],
  ['gut 2 Stunden schmoren', 'gut 2 Stunden', 2 * HOUR],
  ['5–6 Minuten braten', '5–6 Minuten', 6 * MIN],
  ['5-6 Min. braten', '5-6 Min.', 6 * MIN],
  ['5 bis 6 Minuten braten', '5 bis 6 Minuten', 6 * MIN],
  ['zwei bis drei Minuten braten', 'zwei bis drei Minuten', 3 * MIN],
  ['1 Stunde 30 Minuten garen', '1 Stunde 30 Minuten', 90 * MIN],
  ['1 Std. und 30 Min. garen', '1 Std. und 30 Min.', 90 * MIN],
  ['1½ Stunden backen', '1½ Stunden', 90 * MIN],
  ['1,5 Std. backen', '1,5 Std.', 90 * MIN],
  ['eine Stunde ruhen', 'eine Stunde', HOUR],
  ['Eine Minute rühren', 'Eine Minute', MIN],
  ['ein Stunde', 'ein Stunde', HOUR],
  ['zwölf Stunden quellen', 'zwölf Stunden', 12 * HOUR],
  ['fünf Minuten', 'fünf Minuten', 5 * MIN],
  ['sieben Minuten', 'sieben Minuten', 7 * MIN],
  ['eine halbe Stunde ziehen', 'eine halbe Stunde', 30 * MIN],
  ['halbe Stunde ziehen', 'halbe Stunde', 30 * MIN],
  ['eine Viertelstunde ruhen', 'eine Viertelstunde', 15 * MIN],
  ['{Kochzeit} 25 min', '25 min', 25 * MIN],
  ['1/2 Stunde ruhen', '1/2 Stunde', 30 * MIN],
  ['3/4 Std. backen', '3/4 Std.', 45 * MIN],
  ['1 1/2 Stunden backen', '1 1/2 Stunden', 90 * MIN],
  ['2 1/4 Std. schmoren', '2 1/4 Std.', 135 * MIN],
  ['nach einer halben Stunde wenden', 'einer halben Stunde', 30 * MIN],
  ['nach einer Viertelstunde wenden', 'einer Viertelstunde', 15 * MIN],
  ['Auf Stufe 2 - 5 Minuten rühren', '5 Minuten', 5 * MIN],
]

const NEGATIVE = [
  'Bei 180 °C backen',
  '2 cm dick ausrollen',
  '3 Eier verquirlen',
  'Auf Stufe 2 rühren',
  'Auf Stufe eins rühren',
  'um 18 Uhr servieren',
  'ab 18:30 Uhr',
  '{Zimt 5 min} unterheben',
  '5 Scheiben Brot',
  'Achtung, heiß',
  'mit einem Klecks Sahne',
  'in eine Schüssel geben',
  'in der letzten halben Stunde wenden',
  'einen Moment warten',
  'Zeit: 1:30 h',
  '3 S-Haken aufhängen',
]

describe('parseDurations', () => {
  it.each(POSITIVE)('finds a duration in „%s“', (text, label, ms) => {
    const found = parseDurations(text)
    expect(found).toHaveLength(1)
    const [m] = found
    expect(m.label).toBe(label)
    expect(m.durationMs).toBe(ms)
    expect(text.slice(m.start, m.end)).toBe(label)
  })

  it.each(NEGATIVE)('finds nothing in „%s“', (text) => {
    expect(parseDurations(text)).toEqual([])
  })

  it('finds exactly the two spans of a mixed step', () => {
    const found = parseDurations('Etwa 30 Minuten köcheln, dann bei 180 °C 1½ Stunden backen')
    expect(found.map((m) => [m.label, m.durationMs])).toEqual([
      ['Etwa 30 Minuten', 30 * MIN],
      ['1½ Stunden', 90 * MIN],
    ])
  })

  it('keeps spans apart that a comma separates', () => {
    expect(parseDurations('Insgesamt 2 Stunden, 30 Minuten davon zugedeckt').map((m) => m.durationMs)).toEqual([
      2 * HOUR,
      30 * MIN,
    ])
  })

  it('keeps separate spans of the same unit apart', () => {
    expect(parseDurations('10 Minuten braten, wenden, 5 Minuten weiter').map((m) => m.durationMs)).toEqual([
      10 * MIN,
      5 * MIN,
    ])
  })
})
