import { render } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { CategoryMark, categoryInitial } from './CategoryMark'

const category = (name: string) => ({ name, color: '#d95544', colorLight: null, colorDark: null })

describe('categoryInitial', () => {
  it.each([
    ['Ärger', 'Ä'],
    ['🍝 Pasta', '🍝'],
    ['sommer', 'S'],
    ['  brot', 'B'],
    ['ßuppe', 'ß'],
    ['   ', ''],
  ])('%s → %s', (name, expected) => {
    expect(categoryInitial(name)).toBe(expected)
  })
})

describe('categoryInitial grapheme handling', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps a whole grapheme cluster with Intl.Segmenter', () => {
    expect(categoryInitial('👍🏽 Top')).toBe('👍🏽')
  })

  it('falls back to the first code point', () => {
    // Intl's members are not enumerable, so spread would drop them all.
    vi.stubGlobal('Intl', Object.assign(Object.create(Intl), { Segmenter: undefined }))
    expect(categoryInitial('👍🏽 Top')).toBe('👍')
    expect(categoryInitial('sommer')).toBe('S')
  })
})

describe('CategoryMark', () => {
  it.each([
    ['Ärger', 'Ä'],
    ['🍝 Pasta', '🍝'],
    ['sommer', 'S'],
  ])('renders %s as %s', (name, expected) => {
    const { container } = render(<CategoryMark category={category(name)} size="sm" />)
    expect(container.textContent).toBe(expected)
  })

  it('shows the initial, hidden from screen readers, coloured through the category vars', () => {
    const { container } = render(<CategoryMark category={category('sommer')} size="md" />)
    const mark = container.firstElementChild as HTMLElement
    expect(mark.textContent).toBe('S')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.hasAttribute('data-cat')).toBe(true)
    expect(mark.style.getPropertyValue('--cat-soft-l')).not.toBe('')
    expect(mark.className).toContain('size-7')
  })
})
