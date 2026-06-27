import { DEFAULT_STATE, isFilterActive, activeFacetCount, clearedState } from './state'

describe('list state helpers', () => {
  it('DEFAULT_STATE has no active filters', () => {
    expect(isFilterActive(DEFAULT_STATE)).toBe(false)
  })
  it('detects an active facet', () => {
    expect(isFilterActive({ ...DEFAULT_STATE, tags: ['Vegan'] })).toBe(true)
    expect(isFilterActive({ ...DEFAULT_STATE, search: 'apf' })).toBe(true)
    expect(isFilterActive({ ...DEFAULT_STATE, role: 'owner' })).toBe(true)
    expect(isFilterActive({ ...DEFAULT_STATE, durationMax: 30 })).toBe(true)
  })
  it('activeFacetCount counts panel facets, excludes search', () => {
    expect(activeFacetCount(DEFAULT_STATE)).toBe(0)
    expect(activeFacetCount({ ...DEFAULT_STATE, search: 'apf' })).toBe(0) // search not a panel facet
    expect(
      activeFacetCount({ ...DEFAULT_STATE, categories: [1, 2], tags: ['Vegan'], role: 'owner', durationMax: 30 }),
    ).toBe(5)
  })
  it('sort/view changes are not "filters"', () => {
    expect(isFilterActive({ ...DEFAULT_STATE, sortKey: 'rating', detail: 'compact' })).toBe(false)
  })
  it('clearedState keeps sort + view, drops filters', () => {
    const dirty = {
      ...DEFAULT_STATE,
      tags: ['X'],
      search: 'y',
      sortKey: 'rating' as const,
    }
    const out = clearedState(dirty)
    expect(out.tags).toEqual([])
    expect(out.search).toBe('')
    expect(out.sortKey).toBe('rating')
  })
})
