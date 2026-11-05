import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DurationFilter } from './DurationFilter'
import type { ListState } from '../../../list/state'

function Stateful({ initial = null, set }: { initial?: number | null; set: (patch: Partial<ListState>) => void }) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <DurationFilter
      value={value}
      set={(patch) => {
        set(patch)
        if (patch.durationMax !== undefined) setValue(patch.durationMax)
      }}
    />
  )
}

// The slider's aria-label sits on the Radix root; role="slider" is the (unnamed) thumb.
const slider = () => screen.getByRole('slider')
const field = () => screen.getByLabelText<HTMLInputElement>('Maximale Arbeitszeit in Minuten')
const preset = (m: number) => screen.getByRole('radio', { name: `≤ ${m} Minuten` })

describe('DurationFilter', () => {
  it('a preset sets the value and every control follows', () => {
    const set = vi.fn()
    render(<Stateful set={set} />)
    fireEvent.click(preset(30))
    expect(set).toHaveBeenCalledWith({ durationMax: 30 })
    expect(slider().getAttribute('aria-valuenow')).toBe('30')
    expect(field().value).toBe('30')
    expect(preset(30).getAttribute('aria-checked')).toBe('true')
    expect(preset(30).className).toContain('ring-foreground/30')
    expect(preset(15).getAttribute('aria-checked')).toBe('false')
  })

  it('typing a value moves the slider and lights no preset when none matches', () => {
    const set = vi.fn()
    render(<Stateful initial={30} set={set} />)
    fireEvent.change(field(), { target: { value: '45' } })
    expect(set).toHaveBeenLastCalledWith({ durationMax: 45 })
    expect(slider().getAttribute('aria-valuenow')).toBe('45')
    for (const m of [15, 30, 60]) expect(preset(m).getAttribute('aria-checked')).toBe('false')
  })

  it('Zurücksetzen clears the limit', () => {
    const set = vi.fn()
    render(<Stateful initial={45} set={set} />)
    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    expect(set).toHaveBeenLastCalledWith({ durationMax: null })
    expect(field().value).toBe('')
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).toBeNull()
    expect(document.activeElement).toBe(field())
  })

  it('no limit parks the knob at the far right with an empty field', () => {
    render(<DurationFilter value={null} set={() => {}} />)
    expect(slider().getAttribute('aria-valuenow')).toBe('180')
    expect(field().value).toBe('')
  })

  it('gives the presets the 3-px focus ring (#95)', () => {
    render(<DurationFilter value={null} set={() => {}} />)
    for (const m of [15, 30, 60]) {
      const classes = preset(m).className.split(/\s+/)
      expect(classes).toContain('focus-visible:ring-[3px]')
      expect(classes).not.toContain('focus-visible:ring-1')
    }
  })
})
