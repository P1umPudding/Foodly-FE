import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TimerForm } from './TimerForm'
import { useTimers } from './TimerProvider'

vi.mock('./TimerProvider', () => ({ useTimers: vi.fn() }))

function renderForm() {
  const add = vi.fn()
  vi.mocked(useTimers).mockReturnValue({ add } as unknown as ReturnType<typeof useTimers>)
  render(<TimerForm />)
  const duration = screen.getByRole<HTMLInputElement>('textbox', { name: 'Dauer' })
  return { add, duration, form: screen.getByRole('form', { name: 'Neuer Timer' }) }
}

describe('TimerForm', () => {
  it('fills the duration field from a preset without starting a timer', () => {
    const { add, duration } = renderForm()
    expect(duration.value).toBe('0:05:00')
    fireEvent.click(screen.getByRole('button', { name: '10 min' }))
    expect(duration.value).toBe('0:10:00')
    expect(add).not.toHaveBeenCalled()
  })

  it('starts a timer with the typed duration and name, then resets the fields', () => {
    const { add, duration } = renderForm()
    const name = screen.getByRole<HTMLInputElement>('textbox', { name: 'Timer-Name' })
    fireEvent.change(name, { target: { value: ' Nudeln ' } })
    fireEvent.change(duration, { target: { value: '12:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Starten' }))
    expect(add).toHaveBeenCalledWith({ label: 'Nudeln', durationMs: 750_000 })
    expect(duration.value).toBe('0:05:00')
    expect(name.value).toBe('')
  })

  // jsdom doesn't turn Enter into a submit; this covers the handler that Enter reaches in a browser.
  it('starts on form submit', () => {
    const { add, duration, form } = renderForm()
    fireEvent.change(duration, { target: { value: '12' } })
    fireEvent.submit(form)
    expect(add).toHaveBeenCalledWith({ label: '', durationMs: 720_000 })
  })

  it('rejects an invalid duration with an error under the field until it is edited', () => {
    const { add, duration } = renderForm()
    fireEvent.change(duration, { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Starten' }))
    expect(add).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Ungültige Dauer, z. B. 12 oder 0:12:00')
    expect(duration.getAttribute('aria-invalid')).toBe('true')
    expect(duration.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id)
    expect(document.activeElement).toBe(duration)

    fireEvent.change(duration, { target: { value: '1' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(duration.hasAttribute('aria-invalid')).toBe(false)
    expect(duration.hasAttribute('aria-describedby')).toBe(false)
  })
})
