import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RecipeThumb } from './RecipeThumb'

const photo = { id: 3, hash: 'ab12', name: null }
const placeholder = (el: HTMLElement) => el.querySelector('.lucide-utensils-crossed')

describe('RecipeThumb', () => {
  it('shows the photo filling the cell', () => {
    render(<RecipeThumb image={photo} size="md" testId="thumb" />)
    const thumb = screen.getByTestId('thumb')
    expect(thumb.querySelector('img')?.className).toContain('object-cover')
    expect(placeholder(thumb)).toBeNull()
  })

  it('without a photo shows the grey placeholder with cutlery', () => {
    render(<RecipeThumb image={null} size="md" testId="thumb" />)
    const thumb = screen.getByTestId('thumb')
    expect(thumb.className).toContain('bg-muted')
    expect(thumb.querySelector('img')).toBeNull()
    expect(placeholder(thumb)).toBeTruthy()
  })

  it('a photo that fails to load turns into the placeholder', () => {
    render(<RecipeThumb image={photo} size="sm" testId="thumb" />)
    const thumb = screen.getByTestId('thumb')
    fireEvent.error(thumb.querySelector('img')!)
    expect(thumb.querySelector('img')).toBeNull()
    expect(placeholder(thumb)).toBeTruthy()
  })

  it.each([
    ['sm', /\bsize-9\b/, /\bsize-\[18px\]/],
    ['md', /\bh-12 w-12\b/, /\bh-5 w-5\b/],
  ] as const)('size %s: 36 / 48 px cell with a matching icon', (size, box, icon) => {
    render(<RecipeThumb image={null} size={size} testId="thumb" />)
    const thumb = screen.getByTestId('thumb')
    expect(thumb.className).toMatch(box)
    expect(placeholder(thumb)?.getAttribute('class')).toMatch(icon)
  })
})
