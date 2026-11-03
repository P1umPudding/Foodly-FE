import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { TimerRow } from './TimerRow'
import { useTimers } from './TimerProvider'
import type { Timer } from './TimerProvider'

vi.mock('./TimerProvider', () => ({ useTimers: vi.fn() }))

const timer: Timer = {
  id: 't1',
  label: 'Nudeln',
  durationMs: 60_000,
  remainingMs: 30_000,
  endAt: null,
  status: 'running',
}

describe('TimerRow — tap targets', () => {
  it.each([
    ['running', 'running' as const, false, 'Pause'],
    ['paused', 'paused' as const, false, 'Fortsetzen'],
    ['alarming', 'expired' as const, true, 'Stopp'],
  ])('%s: every action is a 40 px square on phones, desktop size unchanged', (_, status, alarming, primary) => {
    vi.mocked(useTimers).mockReturnValue({
      alarmingIds: new Set(alarming ? [timer.id] : []),
      pause: vi.fn(),
      resume: vi.fn(),
      restart: vi.fn(),
      remove: vi.fn(),
      stopAlarm: vi.fn(),
    } as unknown as ReturnType<typeof useTimers>)
    render(
      <TooltipProvider>
        <TimerRow timer={{ ...timer, status }} />
      </TooltipProvider>,
    )
    for (const name of [primary, 'Neustart', 'Löschen']) {
      const button = screen.getByRole('button', { name })
      expect(button.classList.contains('size-9')).toBe(true)
      expect(button.classList.contains('phone:size-10')).toBe(true)
    }
  })
})
