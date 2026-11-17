import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { WakeLockToggle } from './WakeLockToggle'
import { useWakeLock } from '../hooks/useWakeLock'

// jsdom has no navigator.wakeLock, so the real hook would render nothing.
vi.mock('../hooks/useWakeLock', () => ({ useWakeLock: vi.fn() }))

function renderToggle(enabled: boolean) {
  vi.mocked(useWakeLock).mockReturnValue({ enabled, supported: true, toggle: vi.fn() } as unknown as ReturnType<
    typeof useWakeLock
  >)
  render(
    <TooltipProvider>
      <WakeLockToggle />
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
