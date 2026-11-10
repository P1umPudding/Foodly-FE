import { describe, expect, it } from 'vitest'
import { errorMessage } from './errorMessage'

describe('errorMessage', () => {
  it('uses the message of an Error', () => {
    expect(errorMessage(new Error('offline'), 'Fehler')).toBe('offline')
  })

  it('uses a thrown non-blank string', () => {
    expect(errorMessage('kaputt', 'Fehler')).toBe('kaputt')
  })

  it.each([
    ['an Error without message', new Error('')],
    ['an Error with a blank message', new Error('  ')],
    ['a blank string', ' '],
    ['undefined', undefined],
    ['null', null],
    ['an object', { status: 500 }],
  ])('falls back for %s', (_name, value) => {
    expect(errorMessage(value, 'Fehler')).toBe('Fehler')
  })
})
