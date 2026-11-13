import { act, render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
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

// Holds the factor like RecipeDetail does, so a commit re-renders the box.
function renderStateful(props: Partial<Parameters<typeof PortionScaler>[0]> & { factor?: number } = {}) {
  const onChange = vi.fn()
  function Harness() {
    const [factor, setFactor] = useState(props.factor ?? 1)
    return (
      <PortionScaler
        sizeNumber={null}
        sizeText={null}
        {...props}
        factor={factor}
        onChange={(f) => {
          onChange(f)
          setFactor(f)
        }}
      />
    )
  }
  render(
    <TooltipProvider>
      <Harness />
    </TooltipProvider>,
  )
  return { onChange }
}

const box = () => screen.getByLabelText(/Portionen|Mengen-Faktor/) as HTMLInputElement

// The field commits on blur/Enter.
function type(value: string) {
  const input = box()
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('PortionScaler — portions mode', () => {
  it('shows the base portion count and its label, no × sign', () => {
    renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1 })
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
  it('shows a leading × sign and the size descriptor', () => {
    renderScaler({ sizeNumber: null, sizeText: '26 cm Springform', factor: 1 })
    expect(box().value).toBe('1')
    expect(screen.getByText('×')).toBeTruthy()
    expect(screen.getByText('26 cm Springform')).toBeTruthy()
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

describe('PortionScaler — ceilings', () => {
  it('portions have no upper limit (e.g. 120 cookies)', () => {
    const { onChange } = renderScaler({ sizeNumber: 120, sizeText: 'Plätzchen', factor: 1 })
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(onChange).toHaveBeenLastCalledWith(121 / 120)
    fireEvent.click(screen.getByLabelText('Weniger'))
    expect(onChange).toHaveBeenLastCalledWith(119 / 120)
  })

  it('multiplier plus is disabled at ×2, the end of the series', () => {
    renderScaler({ sizeNumber: null, factor: 2 })
    expect((screen.getByLabelText('Mehr') as HTMLButtonElement).disabled).toBe(true)
  })
})

// Only values the URL accepts (src/cook/size.ts) may be committed, so a reload keeps them.
describe('PortionScaler — typed values snap to allowed sizes', () => {
  it.each([
    ['portions: rounds to a whole count', { sizeNumber: 4 }, 1, '2.4', '2', 2 / 4],
    ['portions: no cap', { sizeNumber: 4 }, 1, '150', '150', 150 / 4],
    ['multiplier: nearest series value', { sizeNumber: null }, 1, '1.3', '1.5', 1.5],
    ['multiplier: caps at ×2', { sizeNumber: null }, 1, '5', '2', 2],
    ['multiplier: floors at ×¼', { sizeNumber: null }, 1, '0.1', '0.25', 0.25],
  ])('%s', (_, props, factor, typed, shown, committed) => {
    const { onChange } = renderStateful({ ...props, factor })
    type(typed)
    expect(box().value).toBe(shown)
    expect(onChange).toHaveBeenLastCalledWith(committed)
  })

  it('retyping a fractional count that is shown keeps it', () => {
    const { onChange } = renderStateful({ sizeNumber: 2.5, sizeText: 'Portionen', factor: 1 })
    type('2.5')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a value that snaps to the shown one commits nothing', () => {
    const { onChange } = renderStateful({ sizeNumber: null, factor: 1.5 })
    type('1.6')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('steps a fractional old count to whole ones and back through it', () => {
    renderStateful({ sizeNumber: 2.5, sizeText: 'Portionen', factor: 1 })
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(box().value).toBe('3')
    fireEvent.click(screen.getByLabelText('Weniger'))
    expect(box().value).toBe('2.5')
    fireEvent.click(screen.getByLabelText('Weniger'))
    expect(box().value).toBe('2')
  })
})

describe('PortionScaler — commit rules', () => {
  it('clearing the field resets to the default (factor 1)', () => {
    const { onChange } = renderScaler({ sizeNumber: 4, sizeText: 'Portionen', factor: 1.5 })
    type('')
    expect(onChange).toHaveBeenLastCalledWith(1)
  })
})

// #71: after a commit the box shows the applied value, even when the factor didn't change.
describe('PortionScaler — field shows the applied value', () => {
  const portions = { sizeNumber: 4, sizeText: 'Portionen' }
  const multiplier = { sizeNumber: null }

  it.each([
    ['portions, unscaled: cleared', portions, 1, '', '4', 1],
    ['portions, unscaled: 0', portions, 1, '0', '4', 1],
    ['portions, unscaled: negative', portions, 1, '-2', '4', null],
    ['portions, scaled: negative', portions, 1.5, '-2', '6', null],
    ['portions, scaled: cleared', portions, 1.5, '', '4', 1],
    ['portions: rounds to 0', portions, 1, '0.001', '4', 1],
    ['portions: exponent that rounds to 0', portions, 1, '1e-9', '4', 1],
    ['portions: rounds to the shown value', portions, 1, '4.001', '4', null],
    ['portions: valid value', portions, 1, '6', '6', 1.5],
    ['multiplier, unscaled: cleared', multiplier, 1, '', '1', 1],
    ['multiplier, unscaled: 0', multiplier, 1, '0', '1', 1],
    ['multiplier, scaled: negative', multiplier, 1.5, '-2', '1.5', null],
    ['multiplier, scaled: cleared', multiplier, 1.5, '', '1', 1],
  ])('%s', (_, props, factor, typed, shown, committed) => {
    const { onChange } = renderStateful({ ...props, factor })
    type(typed)
    expect(box().value).toBe(shown)
    if (committed === null) expect(onChange).not.toHaveBeenCalled()
    else expect(onChange).toHaveBeenLastCalledWith(committed)
  })

  it('Enter commits like blur and keeps focus in the box', () => {
    const { onChange } = renderStateful({ ...portions, factor: 1 })
    const input = box()
    act(() => input.focus())
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(box().value).toBe('4')
    expect(onChange).toHaveBeenLastCalledWith(1)
    // A remounting fix would drop focus here.
    expect(document.activeElement).toBe(input)
    // The blur that follows has nothing left to commit.
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  // QA (#72): a factor of 0 or NaN shows up as "0" / "NaN" amounts.
  it.each(['', '0', '-0', '0.001', '1e-9', '-2', 'abc', '1e999'])('never commits factor 0 or NaN for %j', (typed) => {
    const { onChange } = renderStateful({ ...portions, factor: 1.5 })
    type(typed)
    for (const [f] of onChange.mock.calls) expect(Number.isFinite(f) && f > 0).toBe(true)
  })

  it('typing the current value commits nothing', () => {
    const { onChange } = renderStateful({ ...portions, factor: 1 })
    type('4')
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each([
    ['negative', '-2'],
    ['cleared', ''],
  ])('steppers still drive the box after a %s commit', (_, typed) => {
    renderStateful({ ...multiplier, factor: 1 })
    type(typed)
    expect(box().value).toBe('1')
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(box().value).toBe('1.5')
  })
})

describe('PortionScaler — pending edits', () => {
  it('a stepper change drops a pending edit, so the next blur cannot overwrite it', () => {
    const { onChange } = renderStateful({ sizeNumber: 4, sizeText: 'Portionen', factor: 1 })
    fireEvent.change(box(), { target: { value: '7' } })
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(box().value).toBe('5')
    // Stepping back to the value the edit was typed over doesn't revive it.
    fireEvent.click(screen.getByLabelText('Weniger'))
    expect(box().value).toBe('4')
    fireEvent.click(screen.getByLabelText('Mehr'))
    fireEvent.blur(box())
    expect(box().value).toBe('5')
    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenLastCalledWith(5 / 4)
  })
})

describe('PortionScaler — tap targets', () => {
  // Exact tokens: jsdom applies no CSS, and `phone:size-10` contains `size-10` as a substring.
  const has = (el: Element, token: string) => el.classList.contains(token)

  it.each([
    ['portions', { sizeNumber: 4 }],
    ['multiplier', { sizeNumber: null }],
  ])('%s: keeps iconSm and adds the phone tap-target classes', (_, props) => {
    renderScaler(props)
    for (const name of ['Weniger', 'Mehr']) {
      const button = screen.getByRole('button', { name })
      expect(has(button, 'size-7.5')).toBe(true)
      expect(has(button, 'phone:size-10')).toBe(true)
    }
  })
})

// Old data can carry 0 or a negative count; dividing by it would show Infinity/NaN.
describe('PortionScaler — portion count 0 or negative', () => {
  it.each([0, -2])('falls back to multiplier mode for %s', (sizeNumber) => {
    const { onChange } = renderScaler({ sizeNumber, sizeText: 'Portionen', factor: 1 })
    expect(screen.getByLabelText('Mengen-Faktor')).toBeTruthy()
    expect(screen.queryByLabelText('Portionen')).toBeNull()
    expect(screen.getByText('×')).toBeTruthy()
    expect(box().value).toBe('1')
    fireEvent.click(screen.getByLabelText('Mehr'))
    expect(onChange).toHaveBeenLastCalledWith(1.5)
    fireEvent.click(screen.getByLabelText('Weniger'))
    expect(onChange).toHaveBeenLastCalledWith(0.75)
  })
})
