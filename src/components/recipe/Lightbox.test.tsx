import { fireEvent, render, screen, within } from '@testing-library/react'
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
    expect(fallback.className).toContain('h-[calc(100dvh-140px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]')

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

  it('Space stays usable on a focused thumbnail, but still cannot reach or scroll the page behind', () => {
    render(
      <>
        <button type="button">Dahinter</button>
        <a href="#x">Link dahinter</a>
        <Lightbox images={images} index={0} onIndexChange={() => {}} onClose={() => {}} />
      </>,
    )
    // fireEvent returns false when a listener called preventDefault (which would cancel the button's click).
    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'Bild 2' }), { key: ' ' })).toBe(true)
    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'Dahinter' }), { key: ' ' })).toBe(false)
    expect(fireEvent.keyDown(screen.getByRole('link', { name: 'Link dahinter' }), { key: ' ' })).toBe(false)
    expect(fireEvent.keyDown(document.body, { key: ' ' })).toBe(false)
  })

  it('show a white focus ring with a gap; the active one has a white border, the others are dimmed', () => {
    render(<Lightbox images={images} index={0} onIndexChange={() => {}} onClose={() => {}} />)

    const inactive = screen.getByRole('button', { name: 'Bild 2' }).className.split(/\s+/)
    expect(inactive).toEqual(
      expect.arrayContaining([
        'focus-visible:ring-[3px]',
        'focus-visible:ring-white/60',
        'focus-visible:ring-offset-2',
        'opacity-55',
        // focus lifts the dimming, or the ring would fall below 3:1
        'focus-visible:opacity-100',
        'size-14',
        'phone:size-11',
      ]),
    )
    expect(inactive).not.toContain('border-white')

    const active = screen.getByRole('button', { name: 'Bild 1' }).className.split(/\s+/)
    expect(active).toContain('border-white')
    expect(active).not.toContain('opacity-55')
  })
})

describe('Lightbox keyboard', () => {
  const images = [ref(1), ref(2), ref(3)]
  const press = (key: string) => fireEvent.keyDown(window, { key })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<Lightbox images={images} index={0} onIndexChange={() => {}} onClose={onClose} />)
    press('Escape')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('wraps around with the arrow keys', () => {
    const onIndexChange = vi.fn()
    const { rerender } = render(<Lightbox images={images} index={2} onIndexChange={onIndexChange} onClose={() => {}} />)
    press('ArrowRight')
    expect(onIndexChange).toHaveBeenLastCalledWith(0)

    rerender(<Lightbox images={images} index={0} onIndexChange={onIndexChange} onClose={() => {}} />)
    press('ArrowLeft')
    expect(onIndexChange).toHaveBeenLastCalledWith(2)
  })

  it('steps from the current index after it changes', () => {
    const onIndexChange = vi.fn()
    const { rerender } = render(<Lightbox images={images} index={0} onIndexChange={onIndexChange} onClose={() => {}} />)
    rerender(<Lightbox images={images} index={1} onIndexChange={onIndexChange} onClose={() => {}} />)
    press('ArrowRight')
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(2)
  })

  it('calls the current handlers when only they change', () => {
    const oldIndexChange = vi.fn()
    const oldClose = vi.fn()
    const { rerender } = render(
      <Lightbox images={images} index={0} onIndexChange={oldIndexChange} onClose={oldClose} />,
    )
    const newIndexChange = vi.fn()
    const newClose = vi.fn()
    rerender(<Lightbox images={images} index={0} onIndexChange={newIndexChange} onClose={newClose} />)

    press('ArrowRight')
    press('Escape')
    expect(newIndexChange).toHaveBeenCalledExactlyOnceWith(1)
    expect(newClose).toHaveBeenCalledTimes(1)
    expect(oldIndexChange).not.toHaveBeenCalled()
    expect(oldClose).not.toHaveBeenCalled()
  })

  it('ignores keys after unmount', () => {
    const onIndexChange = vi.fn()
    const onClose = vi.fn()
    const { unmount } = render(<Lightbox images={images} index={0} onIndexChange={onIndexChange} onClose={onClose} />)
    unmount()
    press('ArrowRight')
    press('Escape')
    expect(onIndexChange).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('Lightbox layout', () => {
  const six = [1, 2, 3, 4, 5, 6].map(ref)

  it('shows the counter "2 / 6" and the close button in the top bar, no caption', () => {
    render(<Lightbox images={six} index={1} onIndexChange={() => {}} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Fotos' })
    const counter = screen.getByText('2 / 6')
    expect(counter.getAttribute('aria-live')).toBe('polite')
    // one text node, so the live region reads "3 / 6" on a change, not just "3"
    expect(counter.childNodes).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Schließen' })).toBeTruthy()
    // the image name is only the alt text / thumbnail label now, not a visible caption
    expect(within(dialog).queryByText('Bild 2')).toBeNull()
  })

  it('hides the arrow buttons on the phone', () => {
    render(<Lightbox images={six} index={0} onIndexChange={() => {}} onClose={() => {}} />)
    for (const name of ['Vorheriges Bild', 'Nächstes Bild']) {
      expect(screen.getByRole('button', { name }).className.split(/\s+/)).toContain('phone:hidden')
    }
  })

  it('with a single image: "1 / 1", no arrows, no thumbnails', () => {
    render(<Lightbox images={[ref(1)]} index={0} onIndexChange={() => {}} onClose={() => {}} />)
    expect(screen.getByText('1 / 1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nächstes Bild' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Bild 1' })).toBeNull()
  })

  it('closes on a click on the empty stage or the top bar, not on the image or the counter', () => {
    const onClose = vi.fn()
    render(<Lightbox images={six} index={0} onIndexChange={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByAltText('Bild 1'))
    fireEvent.click(screen.getByText('1 / 6'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByAltText('Bild 1').parentElement!)
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('1 / 6').parentElement!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('Lightbox swipe', () => {
  const images = [ref(1), ref(2), ref(3)]
  const stageOf = () => screen.getByAltText(/^Bild \d$/).parentElement!
  const swipe = (dx: number, dy = 0, pointerType = 'touch') => {
    const stage = stageOf()
    fireEvent.pointerDown(stage, { pointerId: 1, pointerType, isPrimary: true, clientX: 200, clientY: 300 })
    fireEvent.pointerUp(stage, { pointerId: 1, pointerType, isPrimary: true, clientX: 200 + dx, clientY: 300 + dy })
  }
  const setup = (index = 0) => {
    const onIndexChange = vi.fn()
    const onClose = vi.fn()
    render(<Lightbox images={images} index={index} onIndexChange={onIndexChange} onClose={onClose} />)
    return { onIndexChange, onClose }
  }

  it('a swipe to the left shows the next image, to the right the previous one, wrapping around', () => {
    const { onIndexChange } = setup(0)
    swipe(-80)
    expect(onIndexChange).toHaveBeenLastCalledWith(1)
    swipe(80)
    expect(onIndexChange).toHaveBeenLastCalledWith(2)
  })

  it('works with a pen too', () => {
    const { onIndexChange } = setup(0)
    swipe(-80, 0, 'pen')
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(1)
  })

  it.each([
    ['too short', 30, 0, 'touch'],
    ['mostly vertical', 60, 90, 'touch'],
    ['a mouse drag', -80, 0, 'mouse'],
  ])('ignores %s', (_name, dx, dy, pointerType) => {
    const { onIndexChange } = setup(0)
    swipe(dx, dy, pointerType)
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  it('ignores a cancelled gesture', () => {
    const { onIndexChange } = setup(0)
    const stage = stageOf()
    fireEvent.pointerDown(stage, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 200, clientY: 0 })
    fireEvent.pointerCancel(stage, { pointerId: 1, pointerType: 'touch' })
    fireEvent.pointerUp(stage, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 0 })
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  it('the click that ends a swipe does not close; the next tap on the stage does', () => {
    const { onClose } = setup(0)
    swipe(-80)
    fireEvent.click(stageOf(), { detail: 1 })
    expect(onClose).not.toHaveBeenCalled()

    // a swipe without a trailing click must not swallow the next tap
    swipe(-80)
    swipe(0)
    fireEvent.click(stageOf(), { detail: 1 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the thumbnail strip finger-scrollable while the page behind stays locked', () => {
    setup(0)
    const strip = screen.getByRole('button', { name: 'Bild 2' }).parentElement!
    expect(fireEvent.touchMove(strip, { touches: [{ identifier: 0, target: strip }] })).toBe(true)
    expect(fireEvent.touchMove(stageOf(), { touches: [{ identifier: 0, target: stageOf() }] })).toBe(false)
    // only horizontal panning, and it never chains to the page
    expect(strip.className.split(/\s+/)).toEqual(expect.arrayContaining(['touch-pan-x', 'overscroll-contain']))
  })

  it('a pinch (second finger down) never ends as a swipe', () => {
    const { onIndexChange } = setup(0)
    const stage = stageOf()
    fireEvent.pointerDown(stage, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 200, clientY: 0 })
    fireEvent.pointerDown(stage, { pointerId: 2, pointerType: 'touch', isPrimary: false, clientX: 300, clientY: 0 })
    fireEvent.pointerUp(stage, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 0 })
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  it('the stage keeps the browser from taking over the drag (no pointercancel)', () => {
    setup(0)
    expect(stageOf().className.split(/\s+/)).toContain('touch-none')
  })

  it('a keyboard click on an arrow after a swipe without trailing click still steps', () => {
    const { onIndexChange } = setup(0)
    swipe(-80)
    fireEvent.click(screen.getByRole('button', { name: 'Nächstes Bild' }), { detail: 0 })
    expect(onIndexChange).toHaveBeenCalledTimes(2)
  })

  it('a pinch that starts on the thumbnail strip does not reach the page', () => {
    setup(0)
    const strip = screen.getByRole('button', { name: 'Bild 2' }).parentElement!
    const twoFingers = [
      { identifier: 0, target: strip },
      { identifier: 1, target: strip },
    ]
    expect(fireEvent.touchMove(strip, { touches: twoFingers })).toBe(false)
  })

  it('a lost pointerup does not block later swipes', () => {
    const { onIndexChange } = setup(0)
    fireEvent.pointerDown(stageOf(), { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 200, clientY: 0 })
    swipe(-80)
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(1)
  })
})
