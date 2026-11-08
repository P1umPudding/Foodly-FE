import { useState } from 'react'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
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
    expect(slider().getAttribute('aria-valuetext')).toBe('Keine Grenze')
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).toBeNull()
    expect(document.activeElement).toBe(field())
  })

  it('a pointer click on Zurücksetzen leaves focus alone (no phone keyboard)', () => {
    render(<Stateful initial={45} set={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }), { detail: 1 })
    expect(document.activeElement).not.toBe(field())
  })

  it('no limit parks the knob at the far right and reads "Keine Grenze"', () => {
    render(<Stateful set={() => {}} />)
    expect(slider().getAttribute('aria-valuenow')).toBe('180')
    expect(slider().getAttribute('aria-valuetext')).toBe('Keine Grenze')
    expect(field().value).toBe('')
    expect(field().placeholder).toBe('Keine Grenze')
    const box = within(field().parentElement!)
    expect(box.queryByText('≤')).toBeNull()
    expect(box.queryByText('min')).toBeNull()
    fireEvent.click(preset(15))
    expect(slider().hasAttribute('aria-valuetext')).toBe(false)
  })

  it.each([
    ['ArrowRight', 175],
    ['End', 30],
    ['PageUp', 150],
  ])('%s to the far right clears the limit instead of setting 180', (key, initial) => {
    const set = vi.fn()
    render(<Stateful initial={initial} set={set} />)
    fireEvent.keyDown(slider(), { key })
    expect(set).toHaveBeenLastCalledWith({ durationMax: null })
    expect(set).not.toHaveBeenCalledWith({ durationMax: 180 })
    expect(slider().getAttribute('aria-valuetext')).toBe('Keine Grenze')
    expect(field().value).toBe('')
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).toBeNull()
  })

  it('a slider value below the maximum sets exactly that value', () => {
    const set = vi.fn()
    render(<Stateful set={set} />)
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' })
    expect(set).toHaveBeenLastCalledWith({ durationMax: 175 })
    expect(field().value).toBe('175')
    fireEvent.keyDown(slider(), { key: 'Home' })
    expect(set).toHaveBeenLastCalledWith({ durationMax: 0 })
    expect(field().value).toBe('0')
  })

  it('typing into the empty field keeps focus and brings back ≤ / min', () => {
    render(<Stateful set={() => {}} />)
    act(() => field().focus())
    fireEvent.change(field(), { target: { value: '4' } })
    expect(document.activeElement).toBe(field())
    const box = within(field().parentElement!)
    expect(box.getByText('≤')).toBeTruthy()
    expect(box.getByText('min')).toBeTruthy()
    fireEvent.change(field(), { target: { value: '' } })
    expect(document.activeElement).toBe(field())
    expect(box.queryByText('≤')).toBeNull()
  })

  it('typing 180 sets a real 180; clearing the field removes the limit', () => {
    const set = vi.fn()
    render(<Stateful initial={30} set={set} />)
    fireEvent.change(field(), { target: { value: '180' } })
    expect(set).toHaveBeenLastCalledWith({ durationMax: 180 })
    expect(field().value).toBe('180')
    expect(slider().getAttribute('aria-valuenow')).toBe('180')
    expect(slider().hasAttribute('aria-valuetext')).toBe(false)
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeTruthy()
    fireEvent.change(field(), { target: { value: '' } })
    expect(set).toHaveBeenLastCalledWith({ durationMax: null })
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
