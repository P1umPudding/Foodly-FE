import { filterLabels, type FilterCatalogs } from './filterLabels'
import { DEFAULT_STATE, type ListState } from './state'
import { UNCATEGORIZED_ID } from './filter'
import type { UserCategory } from '../api/protocol'

const cat = (id: number, name: string): UserCategory => ({
  id,
  user: 1,
  name,
  recipes: [],
  order: id,
  color: '#3366cc',
  colorLight: null,
  colorDark: null,
})

const catalogs: FilterCatalogs = {
  categories: [cat(1, 'Favoriten'), cat(2, 'Kuchen'), cat(3, 'Suppen')],
  ingredients: [
    { id: 10, name: 'Tomaten' },
    { id: 11, name: 'Basilikum' },
    { id: 12, name: 'Mozzarella' },
  ],
}

const labels = (patch: Partial<ListState>) => filterLabels({ ...DEFAULT_STATE, ...patch }, catalogs)

// Reads like the button: first value plus " +n".
const text = (patch: Partial<ListState>) =>
  Object.fromEntries(
    Object.entries(labels(patch)).map(([key, v]) => [key, v && (v.more > 0 ? `${v.first} +${v.more}` : v.first)]),
  )

it('returns null for every filter in the default state', () => {
  expect(text({})).toEqual({ category: null, tags: null, ingredients: null, duration: null, access: null })
})

it('ignores search, sort and view', () => {
  expect(labels({ search: 'Pasta', sortKey: 'rating', detail: 'compact', grouped: false })).toEqual(labels({}))
})

describe('category', () => {
  it('shows a single category by name', () => {
    expect(text({ categories: [1] }).category).toBe('Favoriten')
  })

  it('keeps the first name and the count of the rest apart', () => {
    expect(labels({ categories: [1, 2, 3] }).category).toEqual({ first: 'Favoriten', more: 2 })
    expect(labels({ categories: [1] }).category).toEqual({ first: 'Favoriten', more: 0 })
  })

  it('shows the first picked category plus the count of the rest', () => {
    expect(text({ categories: [1, 2, 3] }).category).toBe('Favoriten +2')
    expect(text({ categories: [3, 1] }).category).toBe('Suppen +1')
  })

  it('names the uncategorised entry "Ohne Kategorie"', () => {
    expect(text({ categories: [UNCATEGORIZED_ID] }).category).toBe('Ohne Kategorie')
    expect(text({ categories: [UNCATEGORIZED_ID, 2] }).category).toBe('Ohne Kategorie +1')
  })

  it('falls back to #id for an unknown category', () => {
    expect(text({ categories: [99] }).category).toBe('#99')
  })
})

describe('tags', () => {
  it('shows one tag, or the first plus the count of the rest', () => {
    expect(text({ tags: ['Vegetarisch'] }).tags).toBe('Vegetarisch')
    expect(text({ tags: ['Vegetarisch', 'Schnell'] }).tags).toBe('Vegetarisch +1')
  })
})

describe('ingredients', () => {
  it('shows one ingredient by name, or the first plus the count of the rest', () => {
    expect(text({ ingredients: [10] }).ingredients).toBe('Tomaten')
    expect(text({ ingredients: [10, 11, 12] }).ingredients).toBe('Tomaten +2')
  })

  it('falls back to #id for an unknown ingredient', () => {
    expect(text({ ingredients: [77, 10] }).ingredients).toBe('#77 +1')
  })
})

describe('duration', () => {
  it('shows the limit in plain minutes', () => {
    expect(text({ durationMax: 30 }).duration).toBe('≤ 30 min')
    expect(text({ durationMax: 90 }).duration).toBe('≤ 90 min')
    expect(text({ durationMax: 0 }).duration).toBe('≤ 0 min')
  })
})

describe('access', () => {
  it('shows the role alone', () => {
    expect(text({ role: 'editor' }).access).toBe('Bearbeiter')
  })

  it('shows the sharing alone', () => {
    expect(text({ collab: 'shared' }).access).toBe('Geteilt')
  })

  it('shows role before sharing when both are set', () => {
    expect(text({ role: 'editor', collab: 'shared' }).access).toBe('Bearbeiter · Geteilt')
    expect(text({ role: 'owner', collab: 'private' }).access).toBe('Besitzer · Privat')
  })
})
