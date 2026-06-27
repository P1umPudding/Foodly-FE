import { normalizeText, matchesSearch } from './search'
import type { Recipe } from '../api/protocol'

const base: Recipe = {
  id: 1,
  owner: 1,
  editors: [],
  viewers: [],
  name: 'Gedeckter Apfelkuchen',
  tags: ['Backen', 'Dessert'],
  source: null,
  rating: [],
  time: null,
  workMinutes: null,
  overallMinutes: null,
  amount: null,
  basePortionMultiplier: null,
  notes: ['Crème fraîche dazu'],
  mainImage: null,
  images: [],
  sections: [{ id: 1, name: 'Mürbeteig', ingredients: [], steps: ['Mehl mischen'] }],
}

describe('normalizeText', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeText('Crème Brûlée')).toBe('creme brulee')
    expect(normalizeText('Über GRÜN')).toBe('uber grun')
  })
})

describe('matchesSearch', () => {
  it('blank query matches everything', () => {
    expect(matchesSearch(base, '')).toBe(true)
    expect(matchesSearch(base, '   ')).toBe(true)
  })
  it('matches recipe name, case/diacritic-insensitive substring', () => {
    expect(matchesSearch(base, 'apfel')).toBe(true)
    expect(matchesSearch(base, 'APFELKUCHEN')).toBe(true)
  })
  it('matches a section name', () => {
    expect(matchesSearch(base, 'murbe')).toBe(true)
  })
  it('matches a tag name', () => {
    expect(matchesSearch(base, 'dessert')).toBe(true)
  })
  it('does NOT match step text or notes', () => {
    expect(matchesSearch(base, 'mehl')).toBe(false)
    expect(matchesSearch(base, 'fraiche')).toBe(false)
  })
})
