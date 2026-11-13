import { describe, expect, it } from 'vitest'
import {
  FACTOR_SERIES,
  clampServings,
  cookHref,
  parseSize,
  snapFactor,
  stepFactor,
  stepServings,
  withSize,
} from './size'

const params = (query: string) => new URLSearchParams(query)

describe('parseSize, portions recipe (sizeNumber 4)', () => {
  it('reads ?servings as a factor of the base', () => {
    expect(parseSize(params('servings=8'), 4)).toBe(2)
    expect(parseSize(params('servings=1'), 4)).toBe(0.25)
    expect(parseSize(params('servings=240'), 120)).toBe(2)
  })

  it.each(['', 'abc', '0', '007', '-2', '2.5', '1e1', ' 3', '99999999999999999999'])(
    'treats servings=%j as factor 1',
    (value) => {
      expect(parseSize(params(`servings=${encodeURIComponent(value)}`), 4)).toBe(1)
    },
  )

  it('is factor 1 without a param', () => {
    expect(parseSize(params(''), 4)).toBe(1)
  })

  it('ignores ?factor, which belongs to fixed-size recipes', () => {
    expect(parseSize(params('factor=2'), 4)).toBe(1)
    expect(parseSize(params('factor=2&servings=2'), 4)).toBe(0.5)
  })
})

describe('parseSize, fixed-size recipe', () => {
  it.each(FACTOR_SERIES)('accepts the series value %s', (factor) => {
    expect(parseSize(params(`factor=${factor}`), null)).toBe(factor)
  })

  it.each(['', 'abc', '0', '-1', '1.3', '3', '0.1', 'Infinity', 'NaN', '0x2', '2e0', '+1.5', ' 2'])(
    'treats factor=%j as factor 1',
    (value) => {
      expect(parseSize(params(`factor=${encodeURIComponent(value)}`), null)).toBe(1)
    },
  )

  it('ignores ?servings', () => {
    expect(parseSize(params('servings=8'), null)).toBe(1)
  })

  // Old data: a count of 0 or below is no portions recipe (hasPortions), so the factor applies.
  it.each([0, -2])('treats sizeNumber %s as fixed size', (sizeNumber) => {
    expect(parseSize(params('factor=2&servings=8'), sizeNumber)).toBe(2)
  })
})

describe('withSize', () => {
  it('writes servings for portions recipes and keeps other params', () => {
    expect(withSize(params('q=x'), 1.5, 4).toString()).toBe('q=x&servings=6')
  })

  it('writes factor for fixed-size recipes', () => {
    expect(withSize(params(''), 0.75, null).toString()).toBe('factor=0.75')
  })

  it('drops the size at factor 1 and replaces an old value', () => {
    expect(withSize(params('servings=6&factor=2&q=x'), 1, 4).toString()).toBe('q=x')
    expect(withSize(params('factor=2'), 0.5, null).toString()).toBe('factor=0.5')
  })

  it('round-trips every value the steppers produce', () => {
    for (const factor of FACTOR_SERIES) {
      expect(parseSize(withSize(params(''), factor, null), null)).toBe(factor)
    }
    for (let servings = 1; servings <= 12; servings++) {
      expect(parseSize(withSize(params(''), servings / 4, 4), 4)).toBe(servings / 4)
    }
  })

  it('round-trips whole servings for a fractional base', () => {
    expect(withSize(params(''), 3 / 2.5, 2.5).toString()).toBe('servings=3')
    expect(parseSize(params('servings=3'), 2.5)).toBe(3 / 2.5)
  })
})

describe('cookHref', () => {
  it('names the servings, also at the default', () => {
    expect(cookHref(5, 1, 4)).toBe('/recipes/5/cook?servings=4')
    expect(cookHref(5, 2, 4)).toBe('/recipes/5/cook?servings=8')
  })

  it('names a factor other than 1 for fixed-size recipes', () => {
    expect(cookHref(5, 1, null)).toBe('/recipes/5/cook')
    expect(cookHref(5, 1.5, null)).toBe('/recipes/5/cook?factor=1.5')
  })

  it('leaves out fractional servings (old data at the default)', () => {
    expect(cookHref(5, 1, 2.5)).toBe('/recipes/5/cook')
  })
})

describe('steppers', () => {
  it('steps along the factor series and stops at its ends', () => {
    expect(stepFactor(1, 1)).toBe(1.5)
    expect(stepFactor(1.5, 1)).toBe(2)
    expect(stepFactor(2, 1)).toBe(2)
    expect(stepFactor(1, -1)).toBe(0.75)
    expect(stepFactor(0.25, -1)).toBe(0.25)
  })

  it('snaps a typed factor to the nearest series value', () => {
    expect(snapFactor(1.3)).toBe(1.5)
    expect(snapFactor(1.2)).toBe(1)
    expect(snapFactor(7)).toBe(2)
    expect(snapFactor(0.1)).toBe(0.25)
  })

  it('keeps servings whole and at least 1, with no upper limit', () => {
    expect(clampServings(2.4)).toBe(2)
    expect(clampServings(0.3)).toBe(1)
    expect(clampServings(150)).toBe(150)
    expect(stepServings(4, 1, 4)).toBe(5)
    expect(stepServings(1, -1, 4)).toBe(1)
    expect(stepServings(120, 1, 120)).toBe(121)
    expect(stepServings(120, -1, 120)).toBe(119)
  })

  it('passes through a fractional base, so it stays reachable', () => {
    expect(stepServings(2.5, 1, 2.5)).toBe(3)
    expect(stepServings(3, -1, 2.5)).toBe(2.5)
    expect(stepServings(2.5, -1, 2.5)).toBe(2)
    expect(stepServings(2, 1, 2.5)).toBe(2.5)
    expect(stepServings(1, -1, 0.5)).toBe(0.5)
    expect(stepServings(0.5, 1, 0.5)).toBe(1)
  })
})
