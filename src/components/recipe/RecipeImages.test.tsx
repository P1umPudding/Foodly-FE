import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecipeImages } from './RecipeImages'
import { ref } from '../../test/images'

const classesOf = (el: HTMLElement) => el.className.split(/\s+/)

describe('RecipeImages tiles', () => {
  it('a single extra image is one named tile button that opens it', () => {
    const onOpen = vi.fn()
    render(<RecipeImages images={[ref(1), ref(2)]} alt="Rezept" onOpen={onOpen} />)

    const tile = screen.getByRole('button', { name: 'Bild 2' })
    expect(tile.getAttribute('type')).toBe('button')
    fireEvent.click(tile)
    expect(onOpen).toHaveBeenCalledWith(1)
  })

  it('two stacked tiles; the second names the hidden images and opens index 2', () => {
    const onOpen = vi.fn()
    render(<RecipeImages images={[ref(1), ref(2), ref(3), ref(4), ref(5)]} alt="Rezept" onOpen={onOpen} />)

    fireEvent.click(screen.getByRole('button', { name: 'Bild 2' }))
    expect(onOpen).toHaveBeenLastCalledWith(1)

    const second = screen.getByRole('button', { name: 'Bild 3, 2 weitere Bilder' })
    expect(second.textContent).toBe('+2')
    fireEvent.click(second)
    expect(onOpen).toHaveBeenLastCalledWith(2)
  })

  it('one hidden image is named in the singular', () => {
    render(<RecipeImages images={[ref(1), ref(2), ref(3), ref(4)]} alt="Rezept" onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: 'Bild 3, 1 weiteres Bild' }).textContent).toBe('+1')
  })

  it('without hidden images the second tile has no "+N" overlay', () => {
    render(<RecipeImages images={[ref(1), ref(2), ref(3)]} alt="Rezept" onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: 'Bild 3' }).textContent).toBe('')
  })

  it('has the 3 px focus ring in the full-opacity ring token (design.md)', () => {
    render(<RecipeImages images={[ref(1), ref(2)]} alt="Rezept" onOpen={() => {}} />)
    const classes = classesOf(screen.getByRole('button', { name: 'Bild 2' }))
    expect(classes).toEqual(expect.arrayContaining(['focus-visible:ring-[3px]', 'focus-visible:ring-ring']))
    expect(classes).not.toContain('focus-visible:ring-ring/50')
  })
})
