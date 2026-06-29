import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TooltipProvider } from '@postxl/ui-components'
import { PortionScaler } from './PortionScaler'

// Tag rendering depends on the tag catalog; render the label verbatim instead.
vi.mock('../TagText', () => ({ TagText: ({ value }: { value: string }) => value }))

function renderScaler(props: Partial<Parameters<typeof PortionScaler>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <TooltipProvider>
      <PortionScaler factor={1} onChange={onChange} sizeNumber={null} sizeText={null} {...props} />
    </TooltipProvider>,
  )
  return { onChange }
}

const box = () => screen.getByLabelText(/Portionen|Mengen-Faktor/) as HTMLInputElement

// DeferredNumberInput only commits on blur/Enter.
function type(value: string) {
  const input = box()
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('PortionScaler — portions mode', () => {
  it('shows the base portion count and its label, no x suffix', () => {
    renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1 })
    expect(box().value).toBe('4')
    expect(screen.getByText('Portionen')).toBeTruthy()
    expect(screen.queryByText('x')).toBeNull()
  })

  it('steps by whole portions and scales by desired ÷ base', () => {
    const { onChange } = renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1 })
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(onChange).toHaveBeenCalledWith(5 / 4)
    fireEvent.click(screen.getByLabelText('Weniger'))
    expect(onChange).toHaveBeenCalledWith(3 / 4)
  })

  it('typing a desired count commits as desired ÷ base', () => {
    const { onChange } = renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1 })
    type('6')
    expect(onChange).toHaveBeenLastCalledWith(6 / 4)
  })

  it('reflects a non-default factor as the scaled portion count', () => {
    renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1.5 })
    expect(box().value).toBe('6')
  })
})

describe('PortionScaler — multiplier mode', () => {
  it('shows an x suffix, no inline descriptor (it lives in the meta row)', () => {
    renderScaler({ sizeNumber: null, sizeText: '26 cm Springform', factor: 1 })
    expect(box().value).toBe('1')
    expect(screen.getByText('x')).toBeTruthy()
    expect(screen.queryByText('26 cm Springform')).toBeNull()
  })

  it('steps the multiplier directly', () => {
    const { onChange } = renderScaler({ sizeNumber: null, sizeText: '26 cm Springform', factor: 1 })
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})

describe('PortionScaler — commit rules', () => {
  it('clearing the field resets to the default (factor 1)', () => {
    const { onChange } = renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1.5 })
    type('')
    expect(onChange).toHaveBeenLastCalledWith(1)
  })
})

describe('PortionScaler — stable layout & reset', () => {
  it('minus is disabled at the floor of 1', () => {
    renderScaler({ sizeNumber: null, sizeText: null, factor: 1 })
    expect((screen.getByLabelText('Weniger') as HTMLButtonElement).disabled).toBe(true)
  })

  it('reset reserves its slot at default but is invisible and non-interactive', () => {
    renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1 })
    const reset = screen.getByLabelText('Skalierung zurücksetzen')
    expect(reset).toBeTruthy() // present in the DOM (slot reserved)…
    expect(reset.parentElement?.className).toContain('invisible') // …but hidden from hover/focus
    expect(reset.getAttribute('tabindex')).toBe('-1')
  })

  it('reset is revealed and resets to default when scaled', () => {
    const { onChange } = renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1.5 })
    const reset = screen.getByLabelText('Skalierung zurücksetzen')
    expect(reset.parentElement?.className).not.toContain('invisible')
    fireEvent.click(reset)
    expect(onChange).toHaveBeenCalledWith(1)
  })
})
