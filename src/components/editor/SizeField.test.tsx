import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SizeField } from './SizeField'

describe('SizeField', () => {
  it('edits the portion count in portions mode', () => {
    const onChange = vi.fn()
    render(<SizeField mode="portions" sizeNumber={4} sizeText="{Portionen}" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Anzahl'), { target: { value: '6' } })

    expect(onChange).toHaveBeenCalledWith({ sizeNumber: 6 })
  })

  it('switching to text mode clears the number', () => {
    const onChange = vi.fn()
    render(<SizeField mode="portions" sizeNumber={4} sizeText="{Portionen}" onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Freitext' }))

    expect(onChange).toHaveBeenCalledWith({ sizeMode: 'text', sizeNumber: null })
  })

  it('hides the number input in text mode', () => {
    render(<SizeField mode="text" sizeNumber={null} sizeText="28 cm {Springform}" onChange={vi.fn()} />)

    expect(screen.queryByLabelText('Anzahl')).toBeNull()
    // No @testing-library/jest-dom in this project (toHaveValue isn't available)
    // — read the DOM value directly, see RecipeList.search.test.tsx for the same idiom.
    expect((screen.getByLabelText('Bezeichnung') as HTMLInputElement).value).toBe('28 cm {Springform}')
  })
})
