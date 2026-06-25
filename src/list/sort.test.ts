import { sortRecipes } from './sort'
import { DEFAULT_STATE } from './state'
import type { Recipe } from '../api/protocol'

const base: Recipe = {
  id: 0,
  owner: 1,
  editors: [],
  viewers: [],
  name: '',
  tags: [],
  source: null,
  rating: [],
  time: null,
  workMinutes: null,
  overallMinutes: null,
  amount: null,
  basePortionMultiplier: null,
  notes: [],
  mainImage: null,
  images: [],
  sections: [],
}
const recipes: Recipe[] = [
  { ...base, id: 1, name: 'Banane', workMinutes: 30 },
  { ...base, id: 2, name: 'Apfel', workMinutes: null },
  { ...base, id: 3, name: 'Clementine', workMinutes: 10 },
]
const ids = (rs: Recipe[]) => rs.map((r) => r.id)

describe('sortRecipes', () => {
  it('name asc (default)', () => {
    expect(ids(sortRecipes(recipes, DEFAULT_STATE, 1))).toEqual([2, 1, 3])
  })
  it('name desc', () => {
    expect(ids(sortRecipes(recipes, { ...DEFAULT_STATE, sortDir: 'desc' }, 1))).toEqual([3, 1, 2])
  })
  it('work asc puts null last', () => {
    expect(ids(sortRecipes(recipes, { ...DEFAULT_STATE, sortKey: 'work', sortDir: 'asc' }, 1))).toEqual([3, 1, 2])
  })
  it('work desc still puts null last', () => {
    expect(ids(sortRecipes(recipes, { ...DEFAULT_STATE, sortKey: 'work', sortDir: 'desc' }, 1))).toEqual([1, 3, 2])
  })
  it('does not mutate the input', () => {
    const copy = [...recipes]
    sortRecipes(recipes, DEFAULT_STATE, 1)
    expect(recipes).toEqual(copy)
  })
  it('overall asc puts null last', () => {
    const withOverall: Recipe[] = [
      { ...base, id: 1, overallMinutes: 60 },
      { ...base, id: 2, overallMinutes: null },
      { ...base, id: 3, overallMinutes: 20 },
    ]
    expect(ids(sortRecipes(withOverall, { ...DEFAULT_STATE, sortKey: 'overall', sortDir: 'asc' }, 1))).toEqual([
      3, 1, 2,
    ])
  })
  it('rating desc uses visibleRating (collaborative averages, private own-only)', () => {
    // Recipe 1: collaborative (has editor 2) — ratings from user 1 (3) and user 2 (5) → avg 4
    // Recipe 2: private (no editors/viewers) — user 1's own rating is 5 → visible 5
    // Recipe 3: private (no editors/viewers) — user 1 has no rating → null (sinks last)
    // Descending: recipe 2 (5) > recipe 1 (4) > recipe 3 (null)
    const withRating: Recipe[] = [
      {
        ...base,
        id: 1,
        editors: [2],
        rating: [
          { user: 1, rating: 3 },
          { user: 2, rating: 5 },
        ],
      },
      { ...base, id: 2, rating: [{ user: 1, rating: 5 }] },
      { ...base, id: 3 },
    ]
    expect(ids(sortRecipes(withRating, { ...DEFAULT_STATE, sortKey: 'rating', sortDir: 'desc' }, 1))).toEqual([2, 1, 3])
  })
})
