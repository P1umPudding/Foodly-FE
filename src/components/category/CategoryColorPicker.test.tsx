import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CategoryColorPicker } from './CategoryColorPicker'
import { SUGGESTED_COLORS, categoryColors, oklchToHex } from '../../lib/categoryColor'
import type { CategoryLike } from '../../lib/categoryColor'

const pasta: CategoryLike = { id: 7, name: 'Pasta', order: 0, color: SUGGESTED_COLORS[0] }

function setup(props: Partial<Parameters<typeof CategoryColorPicker>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <CategoryColorPicker value={SUGGESTED_COLORS[0]} onChange={onChange} name="Suppen" categories={[]} {...props} />,
  )
  return { onChange }
}

const swatch = (n: number) => screen.getByRole('radio', { name: `Farbe ${n}` })
const status = () => screen.getByRole('status')

describe('CategoryColorPicker', () => {
  it('offers the 12 suggestions with the current one checked', () => {
    setup()
    expect(screen.getAllByRole('radio')).toHaveLength(12)
    expect(swatch(1).getAttribute('aria-checked')).toBe('true')
  })

  it('picks a suggestion on click', () => {
    const { onChange } = setup()
    fireEvent.click(swatch(3))
    expect(onChange).toHaveBeenCalledWith(SUGGESTED_COLORS[2])
  })

  it('moves the choice with the right arrow key', async () => {
    const { onChange } = setup()
    act(() => swatch(1).focus())
    fireEvent.keyDown(swatch(1), { key: 'ArrowRight' })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(SUGGESTED_COLORS[1]))
  })

  it('reports a custom colour from the colour input', () => {
    const { onChange } = setup()
    fireEvent.change(screen.getByLabelText('Eigene Farbe'), { target: { value: '#123456' } })
    expect(onChange).toHaveBeenCalledWith('#123456')
  })

  it('matches a suggestion regardless of case', () => {
    setup({ value: SUGGESTED_COLORS[4].toUpperCase() })
    expect(swatch(5).getAttribute('aria-checked')).toBe('true')
  })

  it('checks no suggestion for a custom colour and shows it in the colour input', () => {
    setup({ value: '#123456' })
    for (const radio of screen.getAllByRole('radio')) expect(radio.getAttribute('aria-checked')).toBe('false')
    expect((screen.getByLabelText('Eigene Farbe') as HTMLInputElement).value).toBe('#123456')
  })

  it('previews the name with the chosen colour', () => {
    setup()
    expect(screen.getAllByText('Suppen')).toHaveLength(2)
    expect(screen.getByText(/Varianten für Hell und Dunkel/)).toBeTruthy()
    const dot = categoryColors({ color: SUGGESTED_COLORS[0], colorLight: null, colorDark: null }).light.dot
    const chip = screen.getAllByText('Suppen')[0].closest('[data-cat]') as HTMLElement
    expect(chip.style.getPropertyValue('--cat-dot-l')).toBe(dot)
  })

  it('previews a placeholder while the name is empty', () => {
    setup({ name: '  ' })
    expect(screen.getAllByText('Neue Kategorie')).toHaveLength(2)
  })

  it('warns about a similar existing category by name', () => {
    setup({ categories: [pasta] })
    expect(status().textContent).toBe(
      'Ähnlich wie „Pasta“. Eine andere Farbe macht die beiden leichter unterscheidbar.',
    )
  })

  it('warns about a near but not identical colour', () => {
    setup({ categories: [pasta], value: oklchToHex(0.62, 0.17, 10) })
    expect(status().textContent).toContain('„Pasta“')
  })

  it('does not warn about the category being edited', () => {
    setup({ categories: [pasta], exceptId: pasta.id })
    expect(status().textContent).toBe('')
  })

  it('does not warn for a clearly different colour', () => {
    setup({ categories: [pasta], value: SUGGESTED_COLORS[3] })
    expect(status().textContent).toBe('')
  })

  it('shows a short or uppercase hex as the colour input expects it', () => {
    setup({ value: '#ABC' })
    expect((screen.getByLabelText('Eigene Farbe') as HTMLInputElement).value).toBe('#aabbcc')
  })

  it('stays usable with an invalid value', () => {
    setup({ value: 'kein-hex', categories: [pasta] })
    expect((screen.getByLabelText('Eigene Farbe') as HTMLInputElement).value).toBe('#000000')
    for (const radio of screen.getAllByRole('radio')) expect(radio.getAttribute('aria-checked')).toBe('false')
    expect(status().textContent).toBe('')
  })
})
