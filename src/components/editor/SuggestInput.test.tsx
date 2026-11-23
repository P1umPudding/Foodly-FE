import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SuggestInput } from './SuggestInput'

// jsdom has no layout: stand in the rects of a phone sheet's scroll region, input and list. Each rect moves with the
// region's scrollTop as in a browser, so the order of the scroll steps actually matters.
const layout = { box: { top: 0, bottom: 300 }, input: { top: 260, bottom: 300 }, list: { top: 304, bottom: 544 } }

function rect(top: number, bottom: number) {
  return { top, bottom, left: 0, right: 390, width: 390, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const region = document.querySelector<HTMLElement>('[data-testid=region]')
    const scrolled = region?.scrollTop ?? 0
    if (this === region) return rect(layout.box.top, layout.box.bottom) as DOMRect
    const part = this.getAttribute('role') === 'listbox' ? layout.list : layout.input
    return rect(part.top - scrolled, part.bottom - scrolled) as DOMRect
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window, 'visualViewport')
  layout.box = { top: 0, bottom: 300 }
})

const SUGGESTIONS = [
  { id: 'leinsamen', label: 'Leinsamen' },
  { id: 'linsen', label: 'Linsen' },
]

function Field({ keepListInView }: { keepListInView: boolean }) {
  const [value, setValue] = useState('')
  return (
    <SuggestInput
      label="Zutat"
      value={value}
      onValueChange={setValue}
      suggestions={SUGGESTIONS}
      onSelect={() => {}}
      keepListInView={keepListInView}
    />
  )
}

function setup({ keepListInView = true, scrolls = true } = {}) {
  return render(
    // Inline overflow: jsdom computes inline styles, not Tailwind classes.
    <div data-testid="region" style={scrolls ? { overflowY: 'auto' } : undefined}>
      <Field keepListInView={keepListInView} />
    </div>,
  )
}

const region = () => screen.getByTestId('region')

const type = (value: string) => fireEvent.change(screen.getByRole('combobox'), { target: { value } })

describe('SuggestInput keepListInView', () => {
  it('scrolls the region so the field stays in view and the list shows as far as there is room', () => {
    // Field + list (284 px) don't fit the 250 px left above the keyboard.
    layout.box = { top: 0, bottom: 250 }
    setup()
    type('Lin')
    expect(screen.getByRole('listbox')).toBeTruthy()
    // List bottom (544) brought to 250 would push the field above the top; the field wins at the top edge.
    expect(region().scrollTop).toBe(260)
  })

  it('reveals the whole list when field and list fit', () => {
    layout.box = { top: 0, bottom: 600 }
    setup()
    type('Lin')
    expect(region().scrollTop).toBe(0)

    layout.box = { top: 0, bottom: 500 }
    type('Lins')
    expect(region().scrollTop).toBe(44)
  })

  it('reveals again once the keyboard opens while the list is shown', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => delete frames[id - 1])
    const vv = new EventTarget()
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })

    layout.box = { top: 0, bottom: 600 }
    setup()
    type('Lin')
    expect(region().scrollTop).toBe(0)

    layout.box = { top: 0, bottom: 400 }
    vv.dispatchEvent(new Event('resize'))
    vv.dispatchEvent(new Event('resize'))
    // Merged: the first frame was cancelled, one reveal is left.
    expect(frames.filter(Boolean)).toHaveLength(1)
    act(() => frames.forEach((cb) => cb?.(0)))
    expect(region().scrollTop).toBe(144)
  })

  it('leaves resizes alone once the list is closed', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
    const vv = new EventTarget()
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })

    setup()
    type('Lin')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    vv.dispatchEvent(new Event('resize'))
    expect(frames).toHaveLength(0)
  })

  it('cancels a pending reveal on unmount', () => {
    const cancel = vi.fn()
    vi.stubGlobal('requestAnimationFrame', () => 7)
    vi.stubGlobal('cancelAnimationFrame', cancel)
    const vv = new EventTarget()
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })

    const { unmount } = setup()
    type('Lin')
    vv.dispatchEvent(new Event('resize'))
    cancel.mockClear()
    unmount()
    expect(cancel).toHaveBeenCalledWith(7)
  })

  it('never scrolls the page when nothing around it scrolls', () => {
    setup({ scrolls: false })
    expect(() => type('Lin')).not.toThrow()
    expect(region().scrollTop).toBe(0)
    expect(document.documentElement.scrollTop).toBe(0)
  })

  it('does not scroll without the opt-in (desktop)', () => {
    setup({ keepListInView: false })
    type('Lin')
    expect(screen.getByRole('listbox')).toBeTruthy()
    expect(region().scrollTop).toBe(0)
  })
})
