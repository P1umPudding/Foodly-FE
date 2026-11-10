import { describe, expect, it } from 'vitest'
import { safeNext } from './safeNext'

describe('safeNext', () => {
  it('keeps app-internal paths with query and hash', () => {
    expect(safeNext('/recipes/5')).toBe('/recipes/5')
    expect(safeNext('/recipes?cat=3#top')).toBe('/recipes?cat=3#top')
  })

  it.each([
    null,
    undefined,
    '',
    'recipes/5',
    '//evil.example',
    'https://evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/recipes\n/5',
  ])('falls back to /recipes for %j', (raw) => {
    expect(safeNext(raw)).toBe('/recipes')
  })
})
