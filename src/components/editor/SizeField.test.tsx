import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SizeField } from './SizeField'
import { sizeNumberError } from '../../editor/draft'

// Holds the number like the editor draft does and derives the error the same way BasicsCard does.
function Stateful({ initial }: { initial: number | null }) {
  const [sizeNumber, setSizeNumber] = useState(initial)
  return (
    <SizeField
      mode="portions"
      sizeNumber={sizeNumber}
      sizeText=""
      error={sizeNumberError({ sizeMode: 'portions', sizeNumber })}
      onChange={(patch) => {
        if ('sizeNumber' in patch) setSizeNumber(patch.sizeNumber ?? null)
      }}
    />
  )
}

const count = () => screen.getByLabelText('Anzahl') as HTMLInputElement

describe('SizeField', () => {
  it('edits the portion count in portions mode', () => {
    const onChange = vi.fn()
    render(<SizeField mode="portions" sizeNumber={4} sizeText="{Portionen}" error={null} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Anzahl'), { target: { value: '6' } })

    expect(onChange).toHaveBeenCalledWith({ sizeNumber: 6 })
  })

  it('switching to text mode clears the number', () => {
    const onChange = vi.fn()
    render(<SizeField mode="portions" sizeNumber={4} sizeText="{Portionen}" error={null} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Freitext' }))

    expect(onChange).toHaveBeenCalledWith({ sizeMode: 'text', sizeNumber: null })
  })

  it('hides the number input in text mode', () => {
    render(<SizeField mode="text" sizeNumber={null} sizeText="28 cm {Springform}" error={null} onChange={vi.fn()} />)

    expect(screen.queryByLabelText('Anzahl')).toBeNull()
    // No @testing-library/jest-dom in this project (toHaveValue isn't available)
    // — read the DOM value directly, see RecipeList.search.test.tsx for the same idiom.
    expect((screen.getByLabelText('Bezeichnung') as HTMLInputElement).value).toBe('28 cm {Springform}')
  })

  it.each(['0', '-2'])('flags %s once the field is left', (value) => {
    render(<Stateful initial={4} />)

    fireEvent.change(count(), { target: { value } })
    expect(screen.queryByText('Mindestens 1 Portion.')).toBeNull()
    fireEvent.blur(count())

    const error = screen.getByText('Mindestens 1 Portion.')
    expect(count().getAttribute('aria-invalid')).toBe('true')
    expect(count().getAttribute('aria-describedby')).toBe(error.id)
  })

  it('accepts an empty count', () => {
    render(<Stateful initial={4} />)

    fireEvent.change(count(), { target: { value: '' } })
    fireEvent.blur(count())

    expect(screen.queryByText('Mindestens 1 Portion.')).toBeNull()
    expect(count().getAttribute('aria-invalid')).toBeNull()
  })

  it('shows an invalid count from old data right away, until it is fixed', () => {
    render(<Stateful initial={0} />)

    expect(screen.getByText('Mindestens 1 Portion.')).toBeTruthy()
    fireEvent.change(count(), { target: { value: '2' } })
    expect(screen.queryByText('Mindestens 1 Portion.')).toBeNull()
    expect(count().getAttribute('aria-invalid')).toBeNull()
  })
})
