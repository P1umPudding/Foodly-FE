import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VV_INSET_VAR, useVisualViewportInset } from './useVisualViewportInset'

// jsdom has neither a visualViewport nor a layout: stand both in.
class FakeVisualViewport extends EventTarget {
  height = 800
  offsetTop = 0
  scale = 1
}

let vv: FakeVisualViewport

beforeEach(() => {
  vv = new FakeVisualViewport()
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 800 })
})

afterEach(() => {
  Reflect.deleteProperty(window, 'visualViewport')
  Reflect.deleteProperty(document.documentElement, 'clientHeight')
})

function Sheet({ swapped = false }: { swapped?: boolean }) {
  const ref = useVisualViewportInset<HTMLElement>()
  return swapped ? <section ref={ref} data-testid="sheet" /> : <div ref={ref} data-testid="sheet" />
}

const inset = (el: HTMLElement) => el.style.getPropertyValue(VV_INSET_VAR)

function resize(height: number, offsetTop = 0) {
  act(() => {
    vv.height = height
    vv.offsetTop = offsetTop
    vv.dispatchEvent(new Event('resize'))
  })
}

describe('useVisualViewportInset', () => {
  it('sets the covered height while the keyboard is open and 0 once it closes', () => {
    const { getByTestId } = render(<Sheet />)
    const sheet = getByTestId('sheet')
    expect(inset(sheet)).toBe('0px')

    resize(500)
    expect(inset(sheet)).toBe('300px')

    resize(800)
    expect(inset(sheet)).toBe('0px')
  })

  it('accounts for the visual viewport being panned (iOS scrolls it to the focused field)', () => {
    const { getByTestId } = render(<Sheet />)
    resize(500, 120)
    expect(inset(getByTestId('sheet'))).toBe('180px')
  })

  it('ignores pinch-zoom', () => {
    const { getByTestId } = render(<Sheet />)
    vv.scale = 2
    resize(400)
    expect(inset(getByTestId('sheet'))).toBe('0px')
  })

  it('keeps its listeners across re-renders and removes them on unmount', () => {
    const remove = vi.spyOn(vv, 'removeEventListener')
    const { rerender, unmount } = render(<Sheet />)
    rerender(<Sheet />)
    expect(remove).not.toHaveBeenCalled()
    unmount()
    expect(remove.mock.calls.map((c) => c[0]).sort()).toEqual(['resize', 'scroll'])
  })

  // A sheet that closes and reopens hands the ref a new element: only that one may follow the keyboard.
  it('moves its listeners to a new element', () => {
    const { getByTestId, rerender } = render(<Sheet />)
    const first = getByTestId('sheet')
    rerender(<Sheet swapped />)
    const second = getByTestId('sheet')
    expect(second).not.toBe(first)
    resize(600)
    expect(inset(second)).toBe('200px')
    expect(inset(first)).toBe('0px')
  })

  it('does nothing without visualViewport', () => {
    Reflect.deleteProperty(window, 'visualViewport')
    const { getByTestId } = render(<Sheet />)
    expect(inset(getByTestId('sheet'))).toBe('')
  })
})
