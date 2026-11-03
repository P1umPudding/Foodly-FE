import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { WakeLockToggle } from './WakeLockToggle'

// jsdom has no navigator.wakeLock, so the real hook would render nothing.
vi.mock('../hooks/useWakeLock', () => ({
  useWakeLock: () => ({ enabled: false, supported: true, toggle: vi.fn() }),
}))

describe('WakeLockToggle — tap target', () => {
  it('is 40 px high on phones, desktop size unchanged', () => {
    render(
      <TooltipProvider>
        <WakeLockToggle />
      </TooltipProvider>,
    )
    const button = screen.getByRole('button', { name: 'Bildschirm anlassen: aus' })
    expect(button.classList.contains('h-8')).toBe(true)
    expect(button.classList.contains('phone:h-10')).toBe(true)
  })
})
