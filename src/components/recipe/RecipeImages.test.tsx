import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeHero, RecipeImages } from './RecipeImages'
import { ref } from '../../test/images'
import { setViewport } from '../../test/viewport'

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

const images = (n: number) => Array.from({ length: n }, (_, i) => ref(i + 1))

afterEach(() => setViewport(1024))

describe('RecipeImages gallery', () => {
  it('desktop, 6 images: heading with the count, 4 tiles, the 4th reads "+3" and opens lightbox index 3', () => {
    setViewport(1280)
    const onOpen = vi.fn()
    render(<RecipeImages images={images(6)} onOpen={onOpen} />)

    const heading = screen.getByRole('heading', { name: 'Fotos' })
    expect(within(heading.parentElement!).getByText('6')).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(4)

    const more = screen.getByRole('button', { name: 'Alle 6 Fotos ansehen' })
    expect(within(more).getByText('+3').getAttribute('aria-hidden')).toBe('true')
    fireEvent.click(more)
    expect(onOpen).toHaveBeenLastCalledWith(3)

    fireEvent.click(screen.getByRole('button', { name: 'Foto 1 groß ansehen' }))
    expect(onOpen).toHaveBeenLastCalledWith(0)
    fireEvent.click(screen.getByRole('button', { name: 'Foto 3 groß ansehen' }))
    expect(onOpen).toHaveBeenLastCalledWith(2)
  })

  it('phone, 6 images: 3 tiles, the 3rd reads "+4" and opens image 3', () => {
    setViewport(390)
    const onOpen = vi.fn()
    render(<RecipeImages images={images(6)} onOpen={onOpen} />)

    expect(screen.getAllByRole('button')).toHaveLength(3)
    const more = screen.getByRole('button', { name: 'Alle 6 Fotos ansehen' })
    expect(within(more).getByText('+4')).toBeTruthy()
    fireEvent.click(more)
    expect(onOpen).toHaveBeenLastCalledWith(2)
  })

  it('follows a viewport change while shown', () => {
    setViewport(1280)
    render(<RecipeImages images={images(6)} onOpen={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(4)

    setViewport(390)
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Alle 6 Fotos ansehen' }).textContent).toContain('+4')
  })

  it('4 images: no "+N" on the desktop, "+2" on the phone', () => {
    setViewport(1280)
    const { unmount } = render(<RecipeImages images={images(4)} onOpen={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(4)
    expect(screen.queryByText(/^\+/)).toBeNull()
    unmount()

    setViewport(390)
    render(<RecipeImages images={images(4)} onOpen={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Alle 4 Fotos ansehen' }).textContent).toContain('+2')
  })

  it.each([1280, 390])('3 images at %i px: 3 tiles without "+N"', (width) => {
    setViewport(width)
    render(<RecipeImages images={images(3)} onOpen={() => {}} />)

    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Foto 1 groß ansehen',
      'Foto 2 groß ansehen',
      'Foto 3 groß ansehen',
    ])
    expect(screen.queryByText(/^\+/)).toBeNull()
  })

  it('2 images: 2 square tiles with an 8 px gap, count 2', () => {
    setViewport(1280)
    render(<RecipeImages images={images(2)} onOpen={() => {}} />)

    const tiles = screen.getAllByRole('button')
    expect(tiles).toHaveLength(2)
    expect(within(screen.getByRole('heading', { name: 'Fotos' }).parentElement!).getByText('2')).toBeTruthy()
    expect(classesOf(tiles[0])).toContain('aspect-square')
    expect(classesOf(tiles[0].parentElement!)).toContain('gap-2')
  })

  it.each([0, 1])('renders nothing with %i image(s)', (n) => {
    const { container } = render(<RecipeImages images={images(n)} onOpen={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('has the 3 px focus ring in the full-opacity ring token (design.md)', () => {
    render(<RecipeImages images={images(2)} onOpen={() => {}} />)
    const classes = classesOf(screen.getByRole('button', { name: 'Foto 1 groß ansehen' }))
    expect(classes).toEqual(expect.arrayContaining(['focus-visible:ring-[3px]', 'focus-visible:ring-ring']))
    expect(classes).not.toContain('focus-visible:ring-ring/50')
  })
})
