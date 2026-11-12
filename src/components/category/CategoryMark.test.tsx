import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
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

describe('CategoryMark', () => {
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
