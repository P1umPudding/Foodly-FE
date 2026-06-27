import { toSearchParams, fromSearchParams } from './url'
import { DEFAULT_STATE } from './state'
import type { ListState } from './state'

describe('url serialisation', () => {
  it('default state → empty querystring', () => {
    expect(toSearchParams(DEFAULT_STATE).toString()).toBe('')
  })
  it('round-trips a fully-populated state', () => {
    const s: ListState = {
      categories: [2, 5],
      tags: ['Vegan', 'Schnell'],
      ingredients: [3, 9],
      durationMax: 30,
      role: 'editor',
      collab: 'collaborative',
      search: 'apfel kuchen',
      sortKey: 'rating',
      sortDir: 'desc',
      detail: 'compact',
      grouped: false,
    }
    expect(fromSearchParams(toSearchParams(s))).toEqual(s)
  })
  it('ignores unknown/garbage values', () => {
    const p = new URLSearchParams('role=bogus&sort=nope&dmax=NaN')
    const out = fromSearchParams(p)
    expect(out.role).toBe('any')
    expect(out.sortKey).toBe('name')
    expect(out.durationMax).toBeNull()
  })
})
