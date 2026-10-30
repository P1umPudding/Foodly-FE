import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '../../list/state'
import { NAV_DESTINATIONS, activeCategoryId, listHref, navPrefs, routeTitle, visibleDestinations } from './nav'

const defaults = { sortKey: 'name', sortDir: 'asc', detail: 'detailed', grouped: true } as const

describe('NAV_DESTINATIONS', () => {
  it('shows only Rezepte; Start is prepared but hidden', () => {
    expect(visibleDestinations().map((d) => [d.label, d.path])).toEqual([['Rezepte', '/recipes']])
    expect(NAV_DESTINATIONS.find((d) => d.path === '/')).toMatchObject({ label: 'Start', hidden: true })
  })
})

describe('listHref', () => {
  it('is a bare /recipes with default prefs and no category', () => {
    expect(listHref([], defaults)).toBe('/recipes')
  })

  it('carries the category and non-default prefs', () => {
    expect(listHref([3], { ...defaults, sortKey: 'rating', detail: 'compact' })).toBe(
      '/recipes?cat=3&sort=rating&view=compact',
    )
  })
})

describe('navPrefs', () => {
  it('reads the URL while on the list and ignores its filters', () => {
    const params = new URLSearchParams('cat=2&tag=x&sort=work&dir=desc&group=0')
    expect(navPrefs('/recipes', params, { sortKey: 'rating' })).toEqual({
      sortKey: 'work',
      sortDir: 'desc',
      detail: 'detailed',
      grouped: false,
    })
  })

  it('falls back to the persisted state elsewhere', () => {
    const persisted = { ...DEFAULT_STATE, sortKey: 'rating' as const, categories: [4] }
    expect(navPrefs('/recipes/5', new URLSearchParams('sort=work'), persisted)).toEqual({
      ...defaults,
      sortKey: 'rating',
    })
    expect(navPrefs('/recipes/5', new URLSearchParams(), null)).toEqual(defaults)
  })
})

describe('activeCategoryId', () => {
  const at = (q: string, path = '/recipes') => activeCategoryId(path, new URLSearchParams(q))
  it('is the single selected category on the list', () => {
    expect(at('cat=2&sort=name')).toBe(2)
  })
  it('is null for none, several, or another page', () => {
    expect(at('')).toBeNull()
    expect(at('cat=1&cat=2')).toBeNull()
    expect(at('cat=2', '/recipes/5')).toBeNull()
  })
})

describe('routeTitle', () => {
  it('names the shell routes', () => {
    expect(routeTitle('/recipes')).toBe('Rezepte')
    expect(routeTitle('/recipes/new')).toBe('Neues Rezept')
    expect(routeTitle('/recipes/7')).toBe('Rezept')
    expect(routeTitle('/recipes/7/edit')).toBe('Rezept bearbeiten')
    expect(routeTitle('/nope')).toBe('')
  })
})
