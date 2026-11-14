import { describe, expect, it } from 'vitest'
import { parentHref, staticOriginLabel, subpageOf } from './origin'

describe('subpageOf', () => {
  it('knows the subpages', () => {
    expect(subpageOf('/recipes/7')).toBe('detail')
    expect(subpageOf('/categories/2')).toBe('category')
    expect(subpageOf('/recipes/7/edit')).toBe('editor')
    expect(subpageOf('/recipes/new')).toBe('editor')
  })

  it('leaves main pages and unknown routes alone', () => {
    expect(subpageOf('/')).toBeNull()
    expect(subpageOf('/recipes')).toBeNull()
    expect(subpageOf('/categories')).toBeNull()
    expect(subpageOf('/recipes/7/cook')).toBeNull()
  })
})

describe('parentHref', () => {
  it('leads the editor back to its recipe, everything else to the list', () => {
    expect(parentHref('/recipes/7/edit')).toBe('/recipes/7')
    expect(parentHref('/recipes/new')).toBe('/recipes')
    expect(parentHref('/recipes/7')).toBe('/recipes')
    expect(parentHref('/categories/2')).toBe('/recipes')
  })
})

describe('staticOriginLabel', () => {
  it('names the main pages', () => {
    expect(staticOriginLabel('/')).toBe('Start')
    expect(staticOriginLabel('/recipes')).toBe('Rezepte')
    expect(staticOriginLabel('/categories')).toBe('Kategorien')
    expect(staticOriginLabel('/recipes/7')).toBeNull()
  })
})
