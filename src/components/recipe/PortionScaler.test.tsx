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
  it('shows the base portion count and its label, no × sign', () => {
    renderScaler({ part: 'input', sizeNumber: 4, sizeText: 'Portionen', factor: 1 })
    expect(box().value).toBe('4')
    expect(screen.getByText('Portionen')).toBeTruthy()
    expect(screen.queryByText('×')).toBeNull()
  })

  it('steps by whole portions and scales by desired ÷ base', () => {
    const { onChange } = renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1 })
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(onChange).toHaveBeenCalledWith(5 / 4)
    fireEvent.click(screen.getByLabelText('Weniger'))
    expect(onChange).toHaveBeenCalledWith(3 / 4)
  })

  it('typing a desired count commits as desired ÷ base', () => {
    const { onChange } = renderScaler({ part: 'input', sizeNumber: 4, sizeText: 'Portionen', factor: 1 })
    type('6')
    expect(onChange).toHaveBeenLastCalledWith(6 / 4)
  })

  it('reflects a non-default factor as the scaled portion count', () => {
    renderScaler({ part: 'input', sizeNumber: 4, sizeText: 'Portionen', factor: 1.5 })
    expect(box().value).toBe('6')
  })
})

describe('PortionScaler — multiplier mode', () => {
  it('shows a leading × sign, no inline descriptor (it lives in the meta row)', () => {
    renderScaler({ sizeNumber: null, sizeText: '26 cm Springform', factor: 1 })
    expect(box().value).toBe('1')
    expect(screen.getByText('×')).toBeTruthy()
    expect(screen.queryByText('26 cm Springform')).toBeNull()
  })

  it('steps by 0.5 at and above ×1', () => {
    const { onChange } = renderScaler({ sizeNumber: null, factor: 1 })
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(onChange).toHaveBeenCalledWith(1.5)
  })

  it('steps down by 0.25 below ×1', () => {
    const { onChange } = renderScaler({ sizeNumber: null, factor: 1 })
    fireEvent.click(screen.getByLabelText('Weniger'))
    expect(onChange).toHaveBeenCalledWith(0.75)
  })

  it('steps up by 0.25 back to ×1', () => {
    const { onChange } = renderScaler({ sizeNumber: null, factor: 0.75 })
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(onChange).toHaveBeenCalledWith(1)
  })
})

describe('PortionScaler — floors', () => {
  it('portions minus is disabled at the floor of 1', () => {
    renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 0.25 })
    expect((screen.getByLabelText('Weniger') as HTMLButtonElement).disabled).toBe(true)
  })

  it('multiplier minus is disabled at the floor of ×0.25', () => {
    renderScaler({ sizeNumber: null, factor: 0.25 })
    expect((screen.getByLabelText('Weniger') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('PortionScaler — commit rules', () => {
  it('clearing the field resets to the default (factor 1)', () => {
    const { onChange } = renderScaler({ part: 'input', sizeNumber: 4, sizeText: 'Portionen', factor: 1.5 })
    type('')
    expect(onChange).toHaveBeenLastCalledWith(1)
  })
})

describe('PortionScaler — tap targets', () => {
  // Exact tokens: jsdom applies no CSS, and `max-[760px]:size-10` contains `size-10` as a substring.
  const has = (el: Element, token: string) => el.classList.contains(token)

  it.each([
    ['portions steppers', { part: 'steppers' as const, sizeNumber: 4 }],
    ['multiplier scaler', { part: 'full' as const }],
  ])('%s: keeps iconSm and adds the phone tap-target classes', (_, props) => {
    renderScaler(props)
    for (const name of ['Weniger', 'Mehr']) {
      const button = screen.getByRole('button', { name })
      expect(has(button, 'size-7.5')).toBe(true)
      expect(has(button, 'max-[760px]:size-10')).toBe(true)
    }
    // Keep the row from growing next to the 32 px toggles, and the column from widening.
    const pair = screen.getByRole('button', { name: 'Weniger' }).parentElement!
    expect(has(pair, 'gap-1')).toBe(true)
    expect(has(pair, 'max-[760px]:-my-1')).toBe(true)
    expect(has(pair, 'max-[760px]:gap-0')).toBe(true)
    if (props.part === 'full') {
      expect(has(pair, 'ml-2')).toBe(true)
      expect(has(pair, 'max-[760px]:ml-0')).toBe(true)
    }
  })
})
