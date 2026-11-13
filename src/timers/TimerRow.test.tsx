import { fireEvent, render, screen } from '@testing-library/react'
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

function renderRow(row: Timer, alarming = false) {
  const api = {
    alarmingIds: new Set(alarming ? [row.id] : []),
    pause: vi.fn(),
    resume: vi.fn(),
    restart: vi.fn(),
    remove: vi.fn(),
    stopAlarm: vi.fn(),
  }
  vi.mocked(useTimers).mockReturnValue(api as unknown as ReturnType<typeof useTimers>)
  render(
    <TooltipProvider>
      <TimerRow timer={row} />
    </TooltipProvider>,
  )
  return api
}

describe('TimerRow — tap targets', () => {
  it.each([
    ['running', 'running' as const, false, 'Pause'],
    ['paused', 'paused' as const, false, 'Fortsetzen'],
    ['alarming', 'expired' as const, true, 'Stopp'],
  ])('%s: every action is a 40 px square on phones and touch, 30 px on desktop', (_, status, alarming, primary) => {
    renderRow({ ...timer, status }, alarming)
    for (const name of [primary, 'Neustart', 'Entfernen']) {
      const button = screen.getByRole('button', { name })
      expect(button.classList.contains('size-7.5')).toBe(true)
      expect(button.classList.contains('phone:size-10')).toBe(true)
      expect(button.classList.contains('touch:size-10')).toBe(true)
    }
  })
})

describe('TimerRow — mockup row', () => {
  it('shows the elapsed share as a progress bar', () => {
    renderRow(timer)
    const bar = screen.getByRole<HTMLProgressElement>('progressbar', { name: 'Fortschritt Nudeln' })
    expect(bar.value).toBe(0.5)
  })

  it('removes the timer with ✕', () => {
    const { remove } = renderRow(timer)
    fireEvent.click(screen.getByRole('button', { name: 'Entfernen' }))
    expect(remove).toHaveBeenCalledWith('t1')
  })

  it('renders a paused timer subtly', () => {
    renderRow({ ...timer, status: 'paused' })
    expect(screen.getByText('00:30').classList.contains('text-subtle-foreground')).toBe(true)
    expect(screen.getByRole('progressbar').className).toContain('[&::-webkit-progress-value]:bg-subtle-foreground')
  })

  it('fills the bar of a finished timer', () => {
    renderRow({ ...timer, remainingMs: 0, status: 'expired' }, true)
    expect(screen.getByRole<HTMLProgressElement>('progressbar').value).toBe(1)
  })
})
