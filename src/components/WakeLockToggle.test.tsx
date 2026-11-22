import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { WakeLockToggle } from './WakeLockToggle'

function renderToggle(enabled: boolean) {
  render(
    <TooltipProvider>
      <WakeLockToggle enabled={enabled} supported toggle={vi.fn()} />
    </TooltipProvider>,
  )
  return screen.getByRole('button', { name: 'Bildschirm anlassen' })
}

describe('WakeLockToggle — tap target', () => {
  it('is 40 px on phones, 30 px on desktop', () => {
    const button = renderToggle(false)
    expect(button.classList.contains('size-7.5')).toBe(true)
    expect(button.classList.contains('phone:size-10')).toBe(true)
  })
})

describe('WakeLockToggle — state', () => {
  it.each([false, true])('reports the state via aria-pressed (enabled: %s)', (enabled) => {
    const button = renderToggle(enabled)
    expect(button.getAttribute('aria-pressed')).toBe(String(enabled))
    // jsdom applies no CSS: the on-state look hangs on aria-pressed, so these classes must be present.
    expect(button.classList.contains('aria-pressed:border-foreground')).toBe(true)
    expect(button.classList.contains('aria-pressed:bg-accent')).toBe(true)
  })
})

describe('WakeLockToggle — focus ring (#64)', () => {
  // jsdom applies no CSS: assert the postxl Button's ring survives the className merge. It is gated by
  // `focus-visible:` only, so a mouse click shows no ring.
  it.each([false, true])('keeps the 3 px --ring focus ring (enabled: %s)', (enabled) => {
    const button = renderToggle(enabled)
    expect(button.classList.contains('focus-visible:ring-[3px]')).toBe(true)
    expect(button.classList.contains('focus-visible:ring-ring/50')).toBe(true)
    expect(button.classList.contains('focus-visible:ring-0')).toBe(false)
  })
})

describe('WakeLockToggle — unsupported', () => {
  it('renders nothing without the Wake Lock API', () => {
    const { container } = render(<WakeLockToggle enabled={false} supported={false} toggle={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })
})
