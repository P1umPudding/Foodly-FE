import { roleGridCounts, roleCellKey, usedIngredients } from './counts'
import { DEFAULT_STATE } from './state'
import type { Recipe, UserCategory, Ingredient } from '../api/protocol'

const base: Recipe = {
  id: 0,
  owner: 1,
  editors: [],
  viewers: [],
  name: 'R',
  tags: [],
  source: null,
  rating: [],
  time: null,
  workMinutes: 10,
  overallMinutes: null,
  amount: null,
  basePortionMultiplier: null,
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
