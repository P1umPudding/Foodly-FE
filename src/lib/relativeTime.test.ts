import { describe, expect, it } from 'vitest'
import { relativeTime } from './relativeTime'

const now = new Date('2026-11-28T12:00:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

describe('relativeTime', () => {
  it('reads recent and future times as "gerade eben"', () => {
    expect(relativeTime(ago(30_000), now)).toBe('gerade eben')
    expect(relativeTime(ago(-180_000), now)).toBe('gerade eben')
  })

  it('counts minutes, hours and days, then shows the date', () => {
    expect(relativeTime(ago(5 * 60_000), now)).toBe('vor 5 Minuten')
    expect(relativeTime(ago(3 * 3_600_000), now)).toBe('vor 3 Stunden')
    expect(relativeTime(ago(26 * 3_600_000), now)).toBe('gestern')
    expect(relativeTime('2026-10-01T10:00:00Z', now)).toBe('1. Okt. 2026')
  })

  it('returns nothing for an invalid timestamp', () => {
    expect(relativeTime('kaputt', now)).toBe('')
  })
})
