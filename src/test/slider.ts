import { fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// jsdom has no layout and no pointer capture, which a Radix slider drag needs. A 180-px-wide box makes clientX
// equal the slider value for a 0–180 slider.
export function stubSliderPointer() {
  // Left in place (not restorable like the spy): jsdom lacks these entirely, and Vitest isolates each file.
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.hasPointerCapture ??= () => true
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 180,
    bottom: 10,
    width: 180,
    height: 10,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}

// Press at the first x, move through the rest, release at the last.
export function drag(root: HTMLElement, ...xs: number[]) {
  const [first, ...rest] = xs
  fireEvent.pointerDown(root, { pointerId: 1, clientX: first, button: 0 })
  for (const x of rest) fireEvent.pointerMove(root, { pointerId: 1, clientX: x })
  fireEvent.pointerUp(root, { pointerId: 1, clientX: xs[xs.length - 1] })
}
