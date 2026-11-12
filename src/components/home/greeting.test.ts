import { describe, expect, it } from 'vitest'
import { formatHomeDate, greeting } from './greeting'

describe('formatHomeDate', () => {
  it('writes weekday, day and month in German', () => {
    expect(formatHomeDate(new Date(2026, 10, 12, 12))).toBe('Donnerstag, 12. November')
  })
})

describe('greeting', () => {
  it('uses the first name', () => {
    expect(greeting('Kolja Beispiel')).toBe('Hallo Kolja')
    expect(greeting('  Daniel ')).toBe('Hallo Daniel')
  })
  it('is a bare "Hallo" without a name', () => {
    expect(greeting('')).toBe('Hallo')
    expect(greeting('   ')).toBe('Hallo')
    expect(greeting(null)).toBe('Hallo')
    expect(greeting(undefined)).toBe('Hallo')
  })
})
