import { useState } from 'react'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest'
import { DurationFilter } from './DurationFilter'
import type { ListState } from '../../../list/state'
import { drag, stubSliderPointer } from '../../../test/slider'

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
const sliderRoot = () => screen.getByLabelText('Maximale Arbeitszeit')
const field = () => screen.getByLabelText<HTMLInputElement>('Maximale Arbeitszeit in Minuten')
const preset = (m: number) => screen.getByRole('radio', { name: `≤ ${m} Minuten` })

beforeAll(stubSliderPointer)
afterEach(() => vi.useRealTimers())

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

  it('typing moves the slider and lights no preset at once, but commits only on blur', () => {
    const set = vi.fn()
    render(<Stateful initial={30} set={set} />)
    fireEvent.change(field(), { target: { value: '4' } })
    fireEvent.change(field(), { target: { value: '45' } })
    expect(set).not.toHaveBeenCalled()
    expect(slider().getAttribute('aria-valuenow')).toBe('45')
    for (const m of [15, 30, 60]) expect(preset(m).getAttribute('aria-checked')).toBe('false')
    fireEvent.blur(field())
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith({ durationMax: 45 })
  })

  it('Enter commits the typed value; a following blur adds nothing', () => {
    const set = vi.fn()
    render(<Stateful initial={30} set={set} />)
    fireEvent.change(field(), { target: { value: '1' } })
    fireEvent.change(field(), { target: { value: '12' } })
    fireEvent.change(field(), { target: { value: '120' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith({ durationMax: 120 })
    fireEvent.blur(field())
    expect(set).toHaveBeenCalledTimes(1)
  })

  it('a value above the maximum is clamped on commit to a real 180', () => {
    const set = vi.fn()
    render(<Stateful initial={30} set={set} />)
    fireEvent.change(field(), { target: { value: '200' } })
    fireEvent.blur(field())
    expect(set).toHaveBeenCalledWith({ durationMax: 180 })
    expect(field().value).toBe('180')
  })

  it('blur without an edit, or with the unchanged value, commits nothing', () => {
    const set = vi.fn()
    render(<Stateful initial={30} set={set} />)
    fireEvent.blur(field())
    fireEvent.change(field(), { target: { value: '3' } })
    fireEvent.change(field(), { target: { value: '30' } })
    fireEvent.blur(field())
    expect(set).not.toHaveBeenCalled()
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
    vi.useFakeTimers()
    const set = vi.fn()
    render(<Stateful initial={initial} set={set} />)
    fireEvent.keyDown(slider(), { key })
    expect(slider().getAttribute('aria-valuetext')).toBe('Keine Grenze')
    expect(field().value).toBe('')
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith({ durationMax: null })
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).toBeNull()
  })

  it('a slider value below the maximum sets exactly that value', () => {
    vi.useFakeTimers()
    const set = vi.fn()
    render(<Stateful set={set} />)
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(set).toHaveBeenLastCalledWith({ durationMax: 175 })
    expect(field().value).toBe('175')
    fireEvent.keyDown(slider(), { key: 'Home' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(set).toHaveBeenLastCalledWith({ durationMax: 0 })
    expect(field().value).toBe('0')
  })

  it('a burst of arrow keys commits once, after the pause, with the end value', () => {
    vi.useFakeTimers()
    const set = vi.fn()
    render(<Stateful set={set} />)
    for (let i = 0; i < 3; i++) {
      fireEvent.keyDown(slider(), { key: 'ArrowLeft' })
      act(() => {
        vi.advanceTimersByTime(200)
      })
    }
    expect(set).not.toHaveBeenCalled()
    expect(field().value).toBe('165')
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith({ durationMax: 165 })
  })

  it('leaving the knob commits pending arrow keys at once; the timer then adds nothing', () => {
    vi.useFakeTimers()
    const set = vi.fn()
    render(<Stateful set={set} />)
    act(() => slider().focus())
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' })
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' })
    fireEvent.blur(slider())
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith({ durationMax: 170 })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.blur(slider())
    expect(set).toHaveBeenCalledTimes(1)
  })

  it('a drag shows every step but commits once, on release, with the end value', () => {
    const set = vi.fn()
    render(<Stateful set={set} />)
    fireEvent.pointerDown(sliderRoot(), { pointerId: 1, clientX: 120, button: 0 })
    fireEvent.pointerMove(sliderRoot(), { pointerId: 1, clientX: 90 })
    expect(field().value).toBe('90')
    expect(slider().getAttribute('aria-valuenow')).toBe('90')
    fireEvent.pointerMove(sliderRoot(), { pointerId: 1, clientX: 60 })
    expect(set).not.toHaveBeenCalled()
    fireEvent.pointerUp(sliderRoot(), { pointerId: 1, clientX: 60 })
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith({ durationMax: 60 })
    expect(preset(60).getAttribute('aria-checked')).toBe('true')
  })

  it('a drag that ends where it started commits nothing', () => {
    const set = vi.fn()
    render(<Stateful initial={60} set={set} />)
    drag(sliderRoot(), 60, 90, 60)
    expect(set).not.toHaveBeenCalled()
    expect(field().value).toBe('60')
  })

  it('a click on the knob without a change leaves the next arrow key debounced', () => {
    vi.useFakeTimers()
    const set = vi.fn()
    render(<Stateful initial={60} set={set} />)
    fireEvent.pointerDown(slider(), { pointerId: 1, clientX: 60, button: 0 })
    fireEvent.pointerUp(slider(), { pointerId: 1, clientX: 60 })
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' })
    expect(set).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(set).toHaveBeenCalledWith({ durationMax: 55 })
  })

  it('a change from outside drops a pending edit', () => {
    vi.useFakeTimers()
    const set = vi.fn()
    const { rerender } = render(<DurationFilter value={60} set={set} />)
    fireEvent.change(field(), { target: { value: '120' } })
    rerender(<DurationFilter value={30} set={set} />)
    expect(field().value).toBe('30')
    fireEvent.blur(field())
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' })
    rerender(<DurationFilter value={15} set={set} />)
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(set).not.toHaveBeenCalled()
    expect(field().value).toBe('15')
  })

  it('a dropped edit does not come back when the value returns (Back, then Forward)', () => {
    const set = vi.fn()
    const { rerender } = render(<DurationFilter value={60} set={set} />)
    fireEvent.change(field(), { target: { value: '120' } })
    rerender(<DurationFilter value={30} set={set} />)
    rerender(<DurationFilter value={60} set={set} />)
    expect(field().value).toBe('60')
    fireEvent.blur(field())
    expect(set).not.toHaveBeenCalled()
  })

  it('unmounting with a pending edit commits nothing (it would navigate from a page already left)', () => {
    vi.useFakeTimers()
    const set = vi.fn()
    const { unmount } = render(<DurationFilter value={60} set={set} />)
    fireEvent.change(field(), { target: { value: '120' } })
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' })
    unmount()
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(set).not.toHaveBeenCalled()
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
    fireEvent.blur(field())
    expect(set).toHaveBeenLastCalledWith({ durationMax: 180 })
    expect(field().value).toBe('180')
    expect(slider().getAttribute('aria-valuenow')).toBe('180')
    expect(slider().hasAttribute('aria-valuetext')).toBe(false)
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeTruthy()
    fireEvent.change(field(), { target: { value: '' } })
    fireEvent.blur(field())
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
