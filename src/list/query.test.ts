import { describe, expect, it } from 'vitest'
import { applyQuery, buildSearchQuery } from './query'
import { DEFAULT_STATE } from './state'
import type { Recipe } from '../api/protocol'

describe('buildSearchQuery', () => {
  it('maps facets and sort, omitting inactive ones', () => {
    const q = buildSearchQuery({
      ...DEFAULT_STATE,
      tags: ['vegan'],
      ingredients: [3],
      durationMax: 30,
      role: 'owner',
      collab: 'shared',
      sortKey: 'overall',
      sortDir: 'desc',
    })
    expect(q).toEqual({
      filters: {
        tags: ['vegan'],
        ingredients: [3],
        maxWorkTime: 30,
        accessRights: ['owner'],
        shareStates: ['shared'],
      },
      sort: { field: 'totaltime', order: 'desc' },
    })
  })

  it('omits the filters object entirely when no facet is active, and never sends categories', () => {
    const q = buildSearchQuery({ ...DEFAULT_STATE, categories: [1, 2] })
    expect(q.filters).toBeUndefined()
    expect(q.sort).toEqual({ field: 'name', order: 'asc' })
  })
})

function recipe(over: Partial<Recipe>): Recipe {
  return {
    id: 1,
    owner: 1,
    editors: [],
    viewers: [],
    name: 'x',
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
    ...over,
  }
}

describe('applyQuery', () => {
  const recipes = [
    recipe({ id: 1, name: 'B', tags: ['vegan'], workMinutes: 40 }),
    recipe({ id: 2, name: 'A', tags: [], workMinutes: 10 }),
  ]

  it('filters by tags', () => {
    const out = applyQuery(recipes, { filters: { tags: ['vegan'] } }, 1)
    expect(out.map((r) => r.id)).toEqual([1])
  })

  it('filters by maxWorkTime (unknown excluded)', () => {
    const out = applyQuery(recipes, { filters: { maxWorkTime: 20 } }, 1)
    expect(out.map((r) => r.id)).toEqual([2])
  })

  it('sorts by name ascending', () => {
    const out = applyQuery(recipes, { sort: { field: 'name', order: 'asc' } }, 1)
    expect(out.map((r) => r.id)).toEqual([2, 1])
  })
})
