import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '../../list/state'
import { loadPersisted } from '../../list/persistence'
import {
  NAV_DESTINATIONS,
  activeCategoryId,
  categoryPageHref,
  inRecipesSection,
  listHref,
  navPrefs,
  parseCategoryId,
  routeTitle,
} from './nav'

const defaults = { sortKey: 'name', sortDir: 'asc', detail: 'detailed', grouped: true } as const

describe('NAV_DESTINATIONS', () => {
  it('lists Start before Rezepte', () => {
    expect(NAV_DESTINATIONS.map((d) => [d.label, d.path])).toEqual([
      ['Start', '/'],
      ['Rezepte', '/recipes'],
    ])
  })
})

describe('listHref', () => {
  it('is never a bare /recipes, which would restore the stored filters', () => {
    expect(listHref([], defaults)).toBe('/recipes?group=1')
  })

  it('carries the category and the prefs', () => {
    expect(listHref([3], { ...defaults, sortKey: 'rating', detail: 'compact', grouped: false })).toBe(
      '/recipes?cat=3&sort=rating&view=compact&group=0',
    )
  })

  it('filters by role and keeps the prefs', () => {
    const params = new URLSearchParams(
      listHref([], { ...defaults, sortKey: 'work', sortDir: 'desc' }, 'owner').split('?')[1],
    )
    expect(params.get('role')).toBe('owner')
    expect(params.get('sort')).toBe('work')
    expect(params.get('dir')).toBe('desc')
    expect(params.get('group')).toBe('1')
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

// useNavState feeds loadPersisted straight into navPrefs/listHref when the list isn't open.
describe('nav links from the stored list state', () => {
  beforeEach(() => localStorage.clear())
  const storedHref = (detail: string) => {
    localStorage.setItem('foodly:list-state:1', JSON.stringify({ version: 1, state: { detail } }))
    return listHref([], navPrefs('/recipes/5', new URLSearchParams(), loadPersisted(1)))
  }

  it('carries a stored tiles view', () => {
    expect(storedHref('tiles')).toBe('/recipes?view=tiles&group=1')
  })
  it('drops a stored unknown view', () => {
    expect(storedHref('nonsense')).toBe('/recipes?group=1')
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
  it('is the category of its page', () => {
    expect(at('sort=rating', '/categories/7')).toBe(7)
    expect(at('', '/categories/7/')).toBe(7)
    expect(at('', '/categories/abc')).toBeNull()
    expect(at('', '/categories')).toBeNull()
  })
})

describe('category page helpers', () => {
  it('parses only plain integer ids', () => {
    expect(parseCategoryId('12')).toBe(12)
    expect(parseCategoryId('1.5')).toBeNull()
    expect(parseCategoryId('-1')).toBeNull()
    expect(parseCategoryId('x')).toBeNull()
    expect(parseCategoryId(undefined)).toBeNull()
  })
  it('addresses the page and counts it to "Rezepte"', () => {
    expect(categoryPageHref(3)).toBe('/categories/3')
    expect(inRecipesSection('/categories/3')).toBe(true)
    expect(inRecipesSection('/recipes/3/edit')).toBe(true)
    expect(inRecipesSection('/categories')).toBe(false)
  })
})

describe('routeTitle', () => {
  it('names the shell routes', () => {
    expect(routeTitle('/')).toBe('Start')
    expect(routeTitle('/recipes')).toBe('Rezepte')
    expect(routeTitle('/recipes/new')).toBe('Neues Rezept')
    expect(routeTitle('/recipes/7')).toBe('')
    expect(routeTitle('/recipes/7/edit')).toBe('Rezept bearbeiten')
    expect(routeTitle('/categories')).toBe('Kategorien')
    expect(routeTitle('/nope')).toBe('')
  })
})
