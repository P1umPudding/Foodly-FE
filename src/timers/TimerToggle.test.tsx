import { render, screen, within } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { TimerToggle } from './TimerToggle'
import { useTimers } from './TimerProvider'

vi.mock('./TimerProvider', () => ({ useTimers: vi.fn() }))

function renderToggle(nextRemainingMs: number | null, alarmingIds = new Set<string>()) {
  vi.mocked(useTimers).mockReturnValue({ nextRemainingMs, alarmingIds } as unknown as ReturnType<typeof useTimers>)
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
    expect(button.classList.contains('touch:size-10')).toBe(true)
  })

  it('keeps the 40 px height on phones with the countdown, width follows the text', () => {
    const button = renderToggle(65_000)
    expect(button.classList.contains('h-8')).toBe(true)
    expect(button.classList.contains('phone:h-10')).toBe(true)
    expect(button.classList.contains('touch:h-10')).toBe(true)
    expect(button.classList.contains('phone:size-10')).toBe(false)
  })

  it('stays a 40 px square on phones while alarming without a countdown', () => {
    const button = renderToggle(null, new Set(['t1']))
    expect(button.classList.contains('phone:size-10')).toBe(true)
  })
})

describe('TimerToggle — countdown pill', () => {
  it('shows the shortest remaining time in a pill while a timer runs', () => {
    const button = renderToggle(1_122_000)
    const pill = within(button).getByText('18:42')
    expect(pill.classList.contains('bg-muted')).toBe(true)
    expect(pill.classList.contains('rounded-sm')).toBe(true)
  })

  it('shows no pill while no timer runs', () => {
    const button = renderToggle(null)
    expect(button.textContent).toBe('')
  })
})

describe('TimerToggle — focus ring (#64)', () => {
  // jsdom applies no CSS: assert the postxl Button's ring survives the className merge. It is gated by
  // `focus-visible:` only, so a mouse click shows no ring.
  it.each([
    ['idle', null, new Set<string>()],
    ['running', 65_000, new Set<string>()],
    ['alarming', null, new Set(['t1'])],
    ['running and alarming', 65_000, new Set(['t1'])],
  ])('keeps the 3 px --ring focus ring while %s', (_state, nextRemainingMs, alarmingIds) => {
    const button = renderToggle(nextRemainingMs, alarmingIds)
    expect(button.classList.contains('focus-visible:ring-[3px]')).toBe(true)
    expect(button.classList.contains('focus-visible:ring-ring/50')).toBe(true)
    expect(button.classList.contains('focus-visible:ring-0')).toBe(false)
  })
})
