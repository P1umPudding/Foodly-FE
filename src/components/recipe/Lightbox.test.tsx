import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Lightbox } from './Lightbox'
import { ref } from '../../test/images'

beforeAll(() => {
  // jsdom has no scrollTo; the thumbnail strip scrolls the current tile into view on mount.
  Element.prototype.scrollTo ??= vi.fn()
})

describe('Lightbox controls', () => {
  it.each(['Schließen', 'Vorheriges Bild', 'Nächstes Bild'])(
    '%s has the 3 px focus ring, white on the dark overlay (#90/#95)',
    (name) => {
      render(<Lightbox images={[ref(1), ref(2)]} index={0} onIndexChange={() => {}} onClose={() => {}} />)
      const classes = screen.getByRole('button', { name }).className.split(/\s+/)
      expect(classes).toEqual(expect.arrayContaining(['focus-visible:ring-[3px]', 'focus-visible:ring-white/60']))
      expect(classes).not.toContain('focus-visible:ring-2')
    },
  )
})

describe('Lightbox image that fails to load', () => {
  it('shows the placeholder, and clicking it keeps the lightbox open', () => {
    const onClose = vi.fn()
    render(<Lightbox images={[ref(1)]} index={0} onIndexChange={() => {}} onClose={onClose} />)

    fireEvent.error(screen.getByAltText('Bild 1'))
    const fallback = screen.getByRole('img', { name: 'Bild 1' })
    expect(fallback.className).toContain('h-[64vh]')

    fireEvent.click(fallback)
    expect(onClose).not.toHaveBeenCalled()
  })
})
