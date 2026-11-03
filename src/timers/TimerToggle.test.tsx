import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { TimerToggle } from './TimerToggle'
import { useTimers } from './TimerProvider'

vi.mock('./TimerProvider', () => ({ useTimers: vi.fn() }))

function renderToggle(nextRemainingMs: number | null) {
  vi.mocked(useTimers).mockReturnValue({ nextRemainingMs, alarmingIds: new Set() } as unknown as ReturnType<
    typeof useTimers
  >)
  render(
    <TooltipProvider>
      <TimerToggle />
    </TooltipProvider>,
  )
  return screen.getByRole('button', { name: 'Timer' })
}

describe('TimerToggle — tap target', () => {
  // Exact tokens: jsdom applies no CSS, and `phone:size-10` contains `size-10` as a substring.
  it('is a 40 px square on phones while no timer runs, desktop size unchanged', () => {
    const button = renderToggle(null)
    expect(button.classList.contains('size-9')).toBe(true)
    expect(button.classList.contains('phone:size-10')).toBe(true)
  })

  it('keeps the 40 px height on phones with the countdown, width follows the text', () => {
    const button = renderToggle(65_000)
    expect(button.classList.contains('h-8')).toBe(true)
    expect(button.classList.contains('phone:h-10')).toBe(true)
    expect(button.classList.contains('phone:size-10')).toBe(false)
  })
})
