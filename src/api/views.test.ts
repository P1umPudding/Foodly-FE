import {
  roleOf,
  myRole,
  collaborationState,
  visibleRating,
  formatRating,
  canViewRecipe,
  scaleAmount,
  isScalableAmount,
  ingredientParts,
} from './views'
import type { Recipe } from './protocol'

const base: Recipe = {
  id: 1,
  owner: 1,
  editors: [],
  viewers: [],
  name: 'X',
  tags: [],
  source: null,
  rating: [],
  time: null,
  workMinutes: null,
  overallMinutes: null,
  sizeNumber: null,
  sizeText: null,
  notes: [],
  mainImage: null,
  images: [],
  sections: [],
}
const r = (over: Partial<Recipe>): Recipe => ({ ...base, ...over })

describe('roleOf / myRole', () => {
  it('classifies owner, editor, viewer, other', () => {
    const rec = r({ owner: 1, editors: [2], viewers: [3] })
    expect(roleOf(rec, 1)).toBe('owner')
    expect(roleOf(rec, 2)).toBe('editor')
    expect(roleOf(rec, 3)).toBe('viewer')
    expect(roleOf(rec, 9)).toBe('other')
  })
  it('owner wins over editor/viewer membership', () => {
    expect(roleOf(r({ owner: 1, editors: [1], viewers: [1] }), 1)).toBe('owner')
  })
  it('myRole returns other for null user', () => {
    expect(myRole(r({ owner: 1 }), null)).toBe('other')
  })
})

describe('canViewRecipe', () => {
  it('hides another user private recipe (no access)', () => {
    expect(canViewRecipe(r({ owner: 3, editors: [], viewers: [] }), 1)).toBe(false)
  })
  it('shows recipes where the user is owner, editor, or viewer', () => {
    expect(canViewRecipe(r({ owner: 1 }), 1)).toBe(true)
    expect(canViewRecipe(r({ owner: 2, editors: [1] }), 1)).toBe(true)
    expect(canViewRecipe(r({ owner: 2, viewers: [1] }), 1)).toBe(true)
  })
  it('hides a recipe shared only with other users', () => {
    expect(canViewRecipe(r({ owner: 2, viewers: [3], editors: [] }), 1)).toBe(false)
  })
  it('hides everything when there is no current user', () => {
    expect(canViewRecipe(r({ owner: 1 }), null)).toBe(false)
  })
})

describe('collaborationState', () => {
  it('private when no viewers and no editors', () => {
    expect(collaborationState(r({ viewers: [], editors: [] }))).toBe('private')
  })
  it('shared when viewers but no editors', () => {
    expect(collaborationState(r({ viewers: [2], editors: [] }))).toBe('shared')
  })
  it('collaborative when any editor', () => {
    expect(collaborationState(r({ viewers: [], editors: [2] }))).toBe('collaborative')
    expect(collaborationState(r({ viewers: [3], editors: [2] }))).toBe('collaborative')
  })
})

describe('ingredientParts', () => {
  it('joins a catalog name and its Zusatz with a space', () => {
    const line = {
      id: 1,
      ingredient: { id: 5, name: 'Zwiebel' },
      text: 'gehackt',
      amount: '1',
      amountPrefix: null,
      unit: null,
    }
    expect(ingredientParts(line).name).toBe('Zwiebel gehackt')
  })

  it('uses the text as the whole name for free text', () => {
    const line = { id: 2, ingredient: null, text: 'Salz', amount: null, amountPrefix: null, unit: null }
    expect(ingredientParts(line).name).toBe('Salz')
  })
})

describe('scaleAmount', () => {
  it('scales numeric amounts and formats with a German comma', () => {
    expect(scaleAmount('500', 2)).toBe('1000')
    expect(scaleAmount('500', 0.5)).toBe('250')
    expect(scaleAmount('1', 1.5)).toBe('1,5')
  })
  it('passes through null and non-numeric amounts unchanged', () => {
    expect(scaleAmount(null, 2)).toBeNull()
    expect(scaleAmount('etwas', 2)).toBe('etwas')
    expect(scaleAmount('', 2)).toBe('')
    expect(scaleAmount('  ', 2)).toBe('  ')
  })
  it('returns the input unchanged at factor 1 (identity, no reformat)', () => {
    expect(scaleAmount('500', 1)).toBe('500')
    expect(scaleAmount('0.5', 1)).toBe('0.5')
  })
  it('accepts comma or dot as the decimal separator', () => {
    expect(scaleAmount('2.5', 2)).toBe('5')
    expect(scaleAmount('0,5', 2)).toBe('1')
  })
  it('rounds to at most two decimals', () => {
    expect(scaleAmount('1', 1 / 3)).toBe('0,33')
  })
  it('scales Unicode, slash and mixed fractions', () => {
    expect(scaleAmount('½', 2)).toBe('1')
    expect(scaleAmount('1/2', 3)).toBe('1,5')
    expect(scaleAmount('1 / 2', 2)).toBe('1')
    expect(scaleAmount('1½', 2)).toBe('3')
    expect(scaleAmount('1 ½', 2)).toBe('3')
    expect(scaleAmount('1 1/2', 2)).toBe('3')
    expect(scaleAmount('1 1 / 2', 2)).toBe('3')
    expect(scaleAmount('⅓', 2)).toBe('0,67')
    expect(scaleAmount('¾', 2)).toBe('1,5')
  })
  it('scales both ends of a range and keeps the dash and its spacing', () => {
    expect(scaleAmount('1-2', 2)).toBe('2-4')
    expect(scaleAmount('1–2', 1.5)).toBe('1,5–3')
    expect(scaleAmount('½-1', 2)).toBe('1-2')
    expect(scaleAmount('½–1', 2)).toBe('1–2')
    expect(scaleAmount('1 - 2', 2)).toBe('2 - 4')
    expect(scaleAmount('1,5-2.5', 2)).toBe('3-5')
    expect(scaleAmount('1½-2½', 2)).toBe('3-5')
    expect(scaleAmount('1 1/2-2', 2)).toBe('3-4')
  })
  it('reads "2 -1/2" as the range 2 to ½, not a negative amount', () => {
    expect(scaleAmount('2 -1/2', 2)).toBe('4 -1')
  })
  it('keeps the decimal forms the old Number() path accepted', () => {
    expect(scaleAmount('.5', 2)).toBe('1')
    expect(scaleAmount('5.', 2)).toBe('10')
  })
  it('returns fractions and ranges unchanged at factor 1', () => {
    for (const amount of ['½', '1-2', '1 1/2', 'etwas']) expect(scaleAmount(amount, 1)).toBe(amount)
  })
  it('passes through amounts it does not recognise', () => {
    for (const amount of ['1 Dose à 400', '-2', '1-', '1--2', '1/0', '1e2', '1—2', '1,5½', '½1', '1⁄2'])
      expect(scaleAmount(amount, 2)).toBe(amount)
  })
})

describe('isScalableAmount', () => {
  it('is true for numbers, fractions and ranges', () => {
    for (const amount of ['2', '2,5', '½', '1 1/2', '1-2', '½–1']) expect(isScalableAmount(amount)).toBe(true)
  })
  it('is false for empty, missing and unrecognised amounts', () => {
    for (const amount of [null, '', '  ', 'etwas', '1 Dose à 400', '-2', '1/0'])
      expect(isScalableAmount(amount)).toBe(false)
  })
})

describe('visibleRating', () => {
  it('private/shared: shows only the current user own rating', () => {
    const shared = r({
      owner: 1,
      viewers: [2],
      editors: [],
      rating: [
        { user: 1, rating: 5 },
        { user: 2, rating: 1 },
      ],
    })
    expect(visibleRating(shared, 1)).toBe(5) // own, not the average
    const noOwn = r({ owner: 2, viewers: [1], editors: [], rating: [{ user: 2, rating: 4 }] })
    expect(visibleRating(noOwn, 1)).toBeNull() // I have not rated
  })
  it('collaborative: shows the pooled average', () => {
    const collab = r({
      owner: 1,
      editors: [2],
      viewers: [],
      rating: [
        { user: 1, rating: 5 },
        { user: 2, rating: 3 },
      ],
    })
    expect(visibleRating(collab, 1)).toBe(4)
  })
  it('null current user: private/shared yields null', () => {
    const shared = r({ owner: 1, viewers: [2], rating: [{ user: 1, rating: 5 }] })
    expect(visibleRating(shared, null)).toBeNull()
  })
})

describe('formatRating', () => {
  it('always shows one decimal with a comma', () => {
    expect(formatRating(4.5)).toBe('4,5')
    expect(formatRating(4)).toBe('4,0')
    expect(formatRating(0)).toBe('0,0')
    expect(formatRating(5)).toBe('5,0')
  })

  it('rounds raw values to one decimal', () => {
    expect(formatRating(3.6666)).toBe('3,7')
  })
})
