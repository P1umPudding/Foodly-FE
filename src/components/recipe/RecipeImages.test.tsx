import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecipeHero, RecipeImages } from './RecipeImages'
import { ref } from '../../test/images'

const classesOf = (el: HTMLElement) => el.className.split(/\s+/)

describe('RecipeHero', () => {
  it('is a 4:3 button that opens the lightbox', () => {
    const onOpen = vi.fn()
    render(<RecipeHero image={ref(1)} alt="Rezept" onOpen={onOpen} />)

    const hero = screen.getByRole('button', { name: 'Foto groß ansehen' })
    expect(classesOf(hero)).toContain('aspect-[4/3]')
    fireEvent.click(hero)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})

describe('RecipeImages tiles', () => {
  it('shows every image as a named tile button that opens its own index', () => {
    const onOpen = vi.fn()
    render(<RecipeImages images={[ref(2), ref(3), ref(4), ref(5), ref(6)]} onOpen={onOpen} />)

    expect(screen.getAllByRole('button')).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: 'Bild 2' }))
    expect(onOpen).toHaveBeenLastCalledWith(0)
    fireEvent.click(screen.getByRole('button', { name: 'Bild 6' }))
    expect(onOpen).toHaveBeenLastCalledWith(4)
  })

  it('renders nothing without images', () => {
    const { container } = render(<RecipeImages images={[]} onOpen={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('has the 3 px focus ring in the full-opacity ring token (design.md)', () => {
    render(<RecipeImages images={[ref(2)]} onOpen={() => {}} />)
    const classes = classesOf(screen.getByRole('button', { name: 'Bild 2' }))
    expect(classes).toEqual(expect.arrayContaining(['focus-visible:ring-[3px]', 'focus-visible:ring-ring']))
    expect(classes).not.toContain('focus-visible:ring-ring/50')
  })
})
