import { describe, expect, it } from 'vitest'
import { emptyDraft, move, newIngredient, toCreateRecipe, toDraft } from './draft'
import type { Recipe } from '../api/protocol'

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 1,
    owner: 1,
    editors: [],
    viewers: [],
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
    mainImage: 1,
    images: [2, 3],
    sections: [
      {
        id: 10,
        name: 'Sugo',
        ingredients: [
          { id: 100, ingredient: { id: 5, name: 'Zwiebel' }, text: null, amount: '1', amountPrefix: null, unit: null },
          { id: 101, ingredient: null, text: 'Salz', amount: null, amountPrefix: 'ca.', unit: 'Prise' },
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
            { ingredient: null, text: 'Salz', amount: null, amountPrefix: 'ca.', unit: 'Prise' },
          ],
          steps: ['Hacken.', 'Braten.'],
        },
      ],
    })
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
