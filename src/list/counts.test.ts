import { roleGridCounts, roleCellKey, usedIngredients, byFrequency, recipeTagIds, recipeIngredientIds } from './counts'
import { DEFAULT_STATE } from './state'
import type { Recipe, UserCategory, Ingredient } from '../api/protocol'

const base: Recipe = {
  id: 0,
  owner: 1,
  editors: [],
  viewers: [],
  createdAt: null,
  updatedAt: null,
  myAccessSince: null,
  name: 'R',
  tags: [],
  source: null,
  rating: [],
  time: null,
  workMinutes: 10,
  overallMinutes: null,
  sizeNumber: null,
  sizeText: null,
  notes: [],
  mainImage: null,
  images: [],
  sections: [{ id: 1, name: null, ingredients: [], steps: [] }],
}
const recipes: Recipe[] = [
  { ...base, id: 1, owner: 1, editors: [], viewers: [], tags: ['T'] }, // owner|private
  { ...base, id: 2, owner: 1, editors: [], viewers: [2], tags: ['T'] }, // owner|shared
  { ...base, id: 3, owner: 2, editors: [3], viewers: [1] }, // viewer|collaborative
]
const cats: UserCategory[] = []

describe('roleGridCounts', () => {
  it('counts cells with no role/collab filter active', () => {
    const c = roleGridCounts(recipes, DEFAULT_STATE, 1, cats)
    expect(c[roleCellKey('owner', 'private')]).toBe(1)
    expect(c[roleCellKey('owner', 'shared')]).toBe(1)
    expect(c[roleCellKey('viewer', 'collaborative')]).toBe(1)
    expect(c[roleCellKey('owner', 'collaborative')] ?? 0).toBe(0)
  })
  it('counts reflect OTHER facets but ignore role/collab selection', () => {
    const c = roleGridCounts(recipes, { ...DEFAULT_STATE, tags: ['T'], role: 'viewer' }, 1, cats)
    expect(c[roleCellKey('owner', 'private')]).toBe(1) // tag T applied
    expect(c[roleCellKey('viewer', 'collaborative')] ?? 0).toBe(0) // recipe 3 lacks tag T
  })
})

describe('usedIngredients', () => {
  it('only ingredients present in recipes, sorted by catalog name', () => {
    const r: Recipe[] = [
      {
        ...base,
        sections: [
          {
            id: 1,
            name: null,
            steps: [],
            ingredients: [
              {
                id: 1,
                ingredient: { id: 5, name: 'Zwiebel' },
                text: null,
                amount: null,
                amountPrefix: null,
                unit: null,
              },
            ],
          },
        ],
      },
    ]
    const cat: Record<number, Ingredient> = { 5: { id: 5, name: 'Zwiebel' }, 9: { id: 9, name: 'Apfel' } }
    expect(usedIngredients(r, cat)).toEqual([{ id: 5, name: 'Zwiebel' }])
  })
})

describe('byFrequency', () => {
  const ing = (id: number) => ({
    id: 0,
    ingredient: { id, name: `I${id}` },
    text: null,
    amount: null,
    amountPrefix: null,
    unit: null,
  })
  const withIngs = (id: number, ids: (number | null)[]): Recipe => ({
    ...base,
    id,
    sections: [
      {
        id: 1,
        name: null,
        steps: [],
        ingredients: ids.map((i) => (i === null ? { ...ing(0), ingredient: null, text: 'Salz' } : ing(i))),
      },
    ],
  })

  it('orders by how many recipes use an item, ties keep the input order', () => {
    const rs = [
      { ...base, id: 1, tags: ['b', 'c'] },
      { ...base, id: 2, tags: ['c'] },
    ]
    expect(byFrequency(['a', 'b', 'c', 'd'], rs, recipeTagIds, (t) => t)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('keeps the input order without recipes', () => {
    expect(byFrequency(['x', 'a', 'm'], [], recipeTagIds, (t) => t)).toEqual(['x', 'a', 'm'])
  })

  it('counts an ingredient once per recipe and skips free-text rows', () => {
    const rs = [withIngs(1, [2, 2, 2, null]), withIngs(2, [1]), withIngs(3, [1])]
    expect(recipeIngredientIds(rs[0])).toEqual([2, 2, 2])
    expect(byFrequency([2, 1, 3], rs, recipeIngredientIds, (i) => i)).toEqual([1, 2, 3])
  })
})
