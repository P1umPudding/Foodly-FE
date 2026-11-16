import { describe, expect, it } from 'vitest'
import {
  addImage,
  appendIngredients,
  emptyDraft,
  move,
  newIngredient,
  sizeNumberError,
  toCreateRecipe,
  toDraft,
} from './draft'
import type { Recipe } from '../api/protocol'
import { ref } from '../test/images'

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 1,
    owner: 1,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    rating: [],
    name: 'Pasta',
    tags: ['Vegan'],
    source: 'Oma',
    time: '20 min + {Kochzeit} 25 min',
    workMinutes: 20,
    overallMinutes: 45,
    sizeNumber: 4,
    sizeText: '{Portionen}',
    notes: ['Kalt besser.'],
    mainImage: ref(1),
    images: [ref(2), ref(3)],
    sections: [
      {
        id: 10,
        name: 'Sugo',
        ingredients: [
          { id: 100, ingredient: { id: 5, name: 'Zwiebel' }, text: null, amount: '1', amountPrefix: null, unit: null },
          { id: 101, ingredient: null, text: 'Salz', amount: '1', amountPrefix: 'ca.', unit: 'Prise' },
        ],
        steps: ['Hacken.', 'Braten.'],
      },
    ],
    ...over,
  }
}

describe('toDraft', () => {
  it('assigns client keys and drops server ids', () => {
    const draft = toDraft(recipe())
    const keys = draft.sections[0].ingredients.map((i) => i.key)
    expect(new Set(keys).size).toBe(2)
    expect(keys).not.toContain(100)
  })

  it('reads a catalog ingredient as an id and a free-text one as text', () => {
    const [first, second] = toDraft(recipe()).sections[0].ingredients
    expect(first.ingredient).toBe(5)
    expect(first.text).toBe('')
    expect(second.ingredient).toBeNull()
    expect(second.text).toBe('Salz')
  })

  it('derives sizeMode from sizeNumber', () => {
    expect(toDraft(recipe()).sizeMode).toBe('portions')
    expect(toDraft(recipe({ sizeNumber: null, sizeText: '28 cm {Springform}' })).sizeMode).toBe('text')
  })
})

describe('toCreateRecipe', () => {
  // Reads carry ImageRefs (Backend #19), the write body takes bare ids.
  it('sends image ids, not refs', () => {
    const wire = toCreateRecipe(toDraft(recipe({ mainImage: ref(7), images: [ref(8), ref(9)] })))

    expect(wire.mainImage).toBe(7)
    expect(wire.images).toEqual([8, 9])
  })

  it('sends a null main image when there is none', () => {
    const wire = toCreateRecipe(toDraft(recipe({ mainImage: null, images: [] })))

    expect(wire.mainImage).toBeNull()
    expect(wire.images).toEqual([])
  })

  it('round-trips a recipe unchanged', () => {
    const original = recipe()
    const wire = toCreateRecipe(toDraft(original))

    expect(wire).toEqual({
      name: 'Pasta',
      tags: ['Vegan'],
      source: 'Oma',
      time: '20 min + {Kochzeit} 25 min',
      workMinutes: 20,
      overallMinutes: 45,
      sizeNumber: 4,
      sizeText: '{Portionen}',
      notes: ['Kalt besser.'],
      mainImage: 1,
      images: [2, 3],
      sections: [
        {
          name: 'Sugo',
          ingredients: [
            { ingredient: 5, text: null, amount: '1', amountPrefix: null, unit: null },
            { ingredient: null, text: 'Salz', amount: '1', amountPrefix: 'ca.', unit: 'Prise' },
          ],
          steps: ['Hacken.', 'Braten.'],
        },
      ],
    })
  })

  it('shows prefix and amount in one field and splits them again on save', () => {
    const draft = toDraft(recipe())
    expect(draft.sections[0].ingredients[1].amount).toBe('ca. 1')

    draft.sections[0].ingredients[1].amount = 'etwa 200'
    expect(toCreateRecipe(draft).sections[0].ingredients[1]).toMatchObject({ amountPrefix: 'etwa', amount: '200' })
  })

  // Accepted drift of the README §3.3 rule: a legacy prefix without any number becomes the amount.
  it('saves a legacy prefix without an amount as the amount', () => {
    const legacy = recipe()
    legacy.sections[0].ingredients[1] = { ...legacy.sections[0].ingredients[1], amount: null, amountPrefix: 'ca.' }

    const wire = toCreateRecipe(toDraft(legacy))

    expect(wire.sections[0].ingredients[1]).toMatchObject({ amount: 'ca.', amountPrefix: null })
  })

  it('keeps the Zusatz of a catalog ingredient through draft and save', () => {
    const withZusatz = recipe()
    withZusatz.sections[0].ingredients[0] = { ...withZusatz.sections[0].ingredients[0], text: 'nach Geschmack' }

    const draft = toDraft(withZusatz)
    expect(draft.sections[0].ingredients[0]).toMatchObject({ ingredient: 5, text: 'nach Geschmack' })

    const wire = toCreateRecipe(draft)
    expect(wire.sections[0].ingredients[0]).toMatchObject({ ingredient: 5, text: 'nach Geschmack' })
  })

  it('drops ingredient rows with neither an ingredient nor text', () => {
    const draft = toDraft(recipe())
    draft.sections[0].ingredients.push(newIngredient())

    const wire = toCreateRecipe(draft)

    expect(wire.sections[0].ingredients).toHaveLength(2)
  })

  it('drops blank steps and blank notes', () => {
    const draft = toDraft(recipe())
    draft.sections[0].steps.push({ key: 900, text: '   ' })
    draft.notes.push({ key: 901, text: '' })

    const wire = toCreateRecipe(draft)

    expect(wire.sections[0].steps).toEqual(['Hacken.', 'Braten.'])
    expect(wire.notes).toEqual(['Kalt besser.'])
  })

  it('nulls sizeNumber in text mode', () => {
    const draft = toDraft(recipe())
    draft.sizeMode = 'text'
    draft.sizeText = '28 cm {Springform}'

    expect(toCreateRecipe(draft).sizeNumber).toBeNull()
  })

  it('keeps an empty section, with both keys present', () => {
    const wire = toCreateRecipe(emptyDraft())
    expect(wire.sections).toEqual([{ name: null, ingredients: [], steps: [] }])
  })

  it('trims the name but keeps an empty one (the backend rejects it)', () => {
    const draft = emptyDraft()
    draft.name = '  Neu  '
    expect(toCreateRecipe(draft).name).toBe('Neu')
  })
})

describe('move', () => {
  it('swaps a row with its neighbour', () => {
    const rows = [{ key: 1 }, { key: 2 }, { key: 3 }]
    expect(move(rows, 2, -1).map((r) => r.key)).toEqual([2, 1, 3])
    expect(move(rows, 2, 1).map((r) => r.key)).toEqual([1, 3, 2])
  })

  it('is a no-op at the edges and does not mutate the input', () => {
    const rows = [{ key: 1 }, { key: 2 }]
    expect(move(rows, 1, -1).map((r) => r.key)).toEqual([1, 2])
    expect(move(rows, 2, 1).map((r) => r.key)).toEqual([1, 2])
    expect(rows.map((r) => r.key)).toEqual([1, 2])
  })
})

describe('sizeNumberError', () => {
  it('needs at least one portion in portions mode', () => {
    expect(sizeNumberError({ sizeMode: 'portions', sizeNumber: null })).toBeNull()
    expect(sizeNumberError({ sizeMode: 'portions', sizeNumber: 1 })).toBeNull()
    expect(sizeNumberError({ sizeMode: 'portions', sizeNumber: 1.5 })).toBeNull()
    expect(sizeNumberError({ sizeMode: 'portions', sizeNumber: 0 })).toBe('Mindestens 1 Portion.')
    expect(sizeNumberError({ sizeMode: 'portions', sizeNumber: -2 })).toBe('Mindestens 1 Portion.')
    expect(sizeNumberError({ sizeMode: 'portions', sizeNumber: NaN })).toBe('Mindestens 1 Portion.')
  })

  it('ignores the number in text mode', () => {
    expect(sizeNumberError({ sizeMode: 'text', sizeNumber: 0 })).toBeNull()
  })
})

describe('addImage', () => {
  it('makes the image the main one while there is none', () => {
    expect(addImage({ mainImage: null, images: [ref(2)] }, ref(5))).toEqual({ mainImage: ref(5), images: [ref(2)] })
  })

  it('appends to the gallery once there is a main image', () => {
    expect(addImage({ mainImage: ref(1), images: [ref(2)] }, ref(5))).toEqual({
      mainImage: ref(1),
      images: [ref(2), ref(5)],
    })
  })
})

describe('appendIngredients', () => {
  const pasted = [
    { ingredient: 4, text: 'nach Geschmack', amount: '', unit: '' },
    { ingredient: null, text: 'Hackfleisch', amount: '500', unit: 'g' },
  ]

  it('replaces trailing empty rows and appends with fresh keys', () => {
    const filled = { ...newIngredient(), text: 'Zwiebel' }
    const rows = appendIngredients([filled, newIngredient(), { ...newIngredient(), text: ' ' }], pasted)
    expect(rows.map(({ key: _key, ...rest }) => rest)).toEqual([
      { ingredient: null, text: 'Zwiebel', amount: '', unit: '' },
      ...pasted,
    ])
    expect(rows[0]).toBe(filled)
    expect(new Set(rows.map((r) => r.key)).size).toBe(3)
  })

  it('keeps an empty row between filled ones', () => {
    const gap = newIngredient()
    const rows = appendIngredients(
      [{ ...newIngredient(), amount: '1' }, gap, { ...newIngredient(), unit: 'g' }],
      pasted,
    )
    expect(rows).toHaveLength(5)
    expect(rows[1]).toBe(gap)
  })
})
