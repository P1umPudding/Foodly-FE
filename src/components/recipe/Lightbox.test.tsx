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

describe('Lightbox thumbnails', () => {
  const images = [ref(1), ref(2), ref(3)]

  it('are named buttons that switch the image', () => {
    const onIndexChange = vi.fn()
    render(<Lightbox images={images} index={0} onIndexChange={onIndexChange} onClose={() => {}} />)

    for (const name of ['Bild 1', 'Bild 2', 'Bild 3']) {
      expect(screen.getByRole('button', { name }).getAttribute('type')).toBe('button')
    }
    expect(screen.getByRole('button', { name: 'Bild 1' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('button', { name: 'Bild 2' }).hasAttribute('aria-current')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Bild 3' }))
    expect(onIndexChange).toHaveBeenCalledWith(2)
  })

  it('Space stays usable on a focused thumbnail, but still cannot scroll the page elsewhere', () => {
    render(<Lightbox images={images} index={0} onIndexChange={() => {}} onClose={() => {}} />)
    // fireEvent returns false when a listener called preventDefault (which would cancel the button's click).
    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'Bild 2' }), { key: ' ' })).toBe(true)
    expect(fireEvent.keyDown(document.body, { key: ' ' })).toBe(false)
  })

  it('show a white focus ring with a gap, full white on the active one', () => {
    render(<Lightbox images={images} index={0} onIndexChange={() => {}} onClose={() => {}} />)

    const inactive = screen.getByRole('button', { name: 'Bild 2' }).className.split(/\s+/)
    expect(inactive).toEqual(
      expect.arrayContaining([
        'focus-visible:ring-[3px]',
        'focus-visible:ring-white/60',
        'focus-visible:ring-offset-2',
        'focus-visible:ring-offset-black',
      ]),
    )
    expect(inactive).not.toContain('ring-white')

    const active = screen.getByRole('button', { name: 'Bild 1' }).className.split(/\s+/)
    expect(active).toEqual(expect.arrayContaining(['ring-2', 'ring-white', 'focus-visible:ring-white']))
    expect(active).not.toContain('focus-visible:ring-white/60')
  })
})
