import { describe, expect, it } from 'vitest'
import { joinAmount, splitAmount } from './amount'

describe('splitAmount', () => {
  it.each([
    ['ca. 800', 'ca.', '800'],
    ['800', '', '800'],
    ['etwa ½', 'etwa', '½'],
    ['gut 1-2', 'gut', '1-2'],
    ['1–2', '', '1–2'],
    ['0,5', '', '0,5'],
    ['ca.800', 'ca.', '800'],
    ['  ca.  800 ', 'ca.', '800'],
    ['2-3 ca.', '', '2-3 ca.'],
    ['etwas', '', 'etwas'],
    ['gut ⅕', 'gut', '⅕'],
    ['', '', ''],
  ])('splits %j into prefix %j and amount %j', (input, amountPrefix, amount) => {
    expect(splitAmount(input)).toEqual({ amountPrefix, amount })
  })
})

describe('joinAmount', () => {
  it('joins with one space and skips empty parts', () => {
    expect(joinAmount('ca.', '800')).toBe('ca. 800')
    expect(joinAmount('', '800')).toBe('800')
    expect(joinAmount('etwa', '')).toBe('etwa')
    expect(joinAmount('', '')).toBe('')
  })

  it.each([
    ['ca.', '800'],
    ['etwa', '½'],
    ['gut', '1-2'],
    ['', '0,5'],
  ])('round-trips %j + %j through the single field', (amountPrefix, amount) => {
    expect(splitAmount(joinAmount(amountPrefix, amount))).toEqual({ amountPrefix, amount })
  })
})
