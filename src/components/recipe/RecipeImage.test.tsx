import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecipeImage } from './RecipeImage'

const image = { id: 1, hash: 'ab12', name: null }

describe('RecipeImage', () => {
  it('renders the backend image', () => {
    render(<RecipeImage image={image} alt="Pancakes" />)
    expect(screen.getByAltText('Pancakes').getAttribute('src')).toBe('/api/v1/images/ab12')
  })

  it('shows the placeholder instead of a broken image', () => {
    const { container } = render(<RecipeImage image={image} alt="Pancakes" fallbackClassName="size-20" />)
    fireEvent.error(screen.getByAltText('Pancakes'))

    expect(container.querySelector('img')).toBeNull()
    const fallback = screen.getByTestId('image-fallback')
    expect(fallback.className).toContain('size-20')
    expect(screen.getByRole('img', { name: 'Pancakes' })).toBe(fallback)
  })

  it('hides a decorative placeholder from assistive tech', () => {
    const { container } = render(<RecipeImage image={image} alt="" />)
    fireEvent.error(container.querySelector('img')!)
    expect(screen.getByTestId('image-fallback').getAttribute('aria-hidden')).toBe('true')
  })

  it('uses a custom fallback when given', () => {
    const { container } = render(<RecipeImage image={image} alt="" fallback={<span>kein Foto</span>} />)
    fireEvent.error(container.querySelector('img')!)
    expect(screen.getByText('kein Foto')).toBeTruthy()
    expect(screen.queryByTestId('image-fallback')).toBeNull()
  })

  it('shows the next image again after a failed one', () => {
    const { container, rerender } = render(<RecipeImage image={image} alt="" />)
    fireEvent.error(container.querySelector('img')!)
    rerender(<RecipeImage image={{ id: 2, hash: 'cd34', name: null }} alt="" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/v1/images/cd34')
  })

  it('keeps the click handler on the placeholder', () => {
    const onClick = vi.fn()
    const { container } = render(<RecipeImage image={image} alt="" onClick={onClick} />)
    fireEvent.error(container.querySelector('img')!)
    fireEvent.click(screen.getByTestId('image-fallback'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
