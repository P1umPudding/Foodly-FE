import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StepText } from './StepText'
import { TimerProvider, useTimers } from '../../timers/TimerProvider'
import { TimerPanelProvider, useTimerPanel } from '../../timers/TimerPanelContext'

vi.mock('../../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: { Ofen: { id: 'Ofen', svg: null } }, status: 'ready' }),
}))

const STEP = 'Etwa 30 Minuten köcheln, dann im {Ofen} bei 180 °C 1½ Stunden backen'
const LABEL = 'Gulasch · Schritt 3'

// Exposes timers and panel state as text so the tests can assert on them.
function Probe() {
  const { timers } = useTimers()
  const panel = useTimerPanel()
  return (
    <output data-testid="probe">
      {JSON.stringify({ open: panel?.open, timers: timers.map((t) => [t.label, t.durationMs, t.status]) })}
    </output>
  )
}

function renderStep() {
  return render(
    <TimerProvider>
      <TimerPanelProvider>
        <StepText value={STEP} timerLabel={LABEL} />
        <Probe />
      </TimerPanelProvider>
    </TimerProvider>,
  )
}

const probe = () => JSON.parse(screen.getByTestId('probe').textContent ?? '{}')

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('StepText', () => {
  it('renders tag tokens and one chip per time span', () => {
    renderStep()
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Timer starten: Etwa 30 Minuten',
      'Timer starten: 1½ Stunden',
    ])
    expect(document.body.textContent).toContain('im Ofen bei 180 °C')
    expect(document.body.textContent).not.toContain('{Ofen}')
  })

  it('starts a named timer that survives a reload', () => {
    const { unmount } = renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Timer starten: Etwa 30 Minuten' }))
    expect(probe().timers).toEqual([[LABEL, 30 * 60_000, 'running']])

    unmount()
    renderStep()
    expect(probe().timers).toEqual([[LABEL, 30 * 60_000, 'running']])
  })

  it('opens the panel instead of starting the same step timer twice', () => {
    renderStep()
    const chip = screen.getByRole('button', { name: 'Timer starten: Etwa 30 Minuten' })
    fireEvent.click(chip)
    expect(probe().open).toBe(false)
    fireEvent.click(chip)
    expect(probe()).toEqual({ open: true, timers: [[LABEL, 30 * 60_000, 'running']] })

    // A different span of the same step is its own timer.
    fireEvent.click(screen.getByRole('button', { name: 'Timer starten: 1½ Stunden' }))
    expect(probe().timers).toHaveLength(2)
  })

  it('starts a new timer once the old one for the step has run out', () => {
    vi.useFakeTimers()
    renderStep()
    const chip = screen.getByRole('button', { name: 'Timer starten: Etwa 30 Minuten' })
    fireEvent.click(chip)
    act(() => vi.advanceTimersByTime(30 * 60_000 + 500))
    expect(probe().timers).toEqual([[LABEL, 30 * 60_000, 'expired']])

    fireEvent.click(chip)
    expect(probe().timers).toEqual([
      [LABEL, 30 * 60_000, 'expired'],
      [LABEL, 30 * 60_000, 'running'],
    ])
  })
})
