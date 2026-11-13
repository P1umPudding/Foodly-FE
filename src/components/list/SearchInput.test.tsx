import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchInput } from './SearchInput'

describe('SearchInput — clear button', () => {
  it('shows no clear button while empty', () => {
    render(<SearchInput value="" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Leeren' })).toBeNull()
  })

  it('stays 28 px visibly but gets a 40 px hit area on phones, and clears', () => {
    const onChange = vi.fn()
    render(<SearchInput value="Nudeln" onChange={onChange} />)
    const clear = screen.getByRole('button', { name: 'Leeren' })
    // Exact tokens: jsdom applies no CSS. 28 px + 2 × 6 px (-inset-1.5) = 40 px.
    for (const token of ['h-7', 'w-7', 'phone:after:absolute', 'phone:after:-inset-1.5']) {
      expect(clear.classList.contains(token)).toBe(true)
    }
    fireEvent.click(clear)
    expect(onChange).toHaveBeenCalledWith('')
  })
})

describe('SearchInput — input', () => {
  it('hands the input to inputRef (the list focuses it on desktop)', () => {
    const ref = createRef<HTMLInputElement>()
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Suchen…" inputRef={ref} />)
    expect(ref.current).toBe(screen.getByPlaceholderText('Suchen…'))
  })

  it('takes an accessible name', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Suchen…" label="Rezepte suchen" />)
    expect(screen.getByRole('textbox', { name: 'Rezepte suchen' })).toBe(screen.getByPlaceholderText('Suchen…'))
  })

  it('is 40 px tall on phones', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Suchen…" />)
    expect(screen.getByPlaceholderText('Suchen…').classList.contains('phone:h-10')).toBe(true)
  })

  it('shows a magnifier in front of the text', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} placeholder="Rezept oder Zutat suchen" />)
    const icon = container.querySelector('svg.lucide-search')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByPlaceholderText('Rezept oder Zutat suchen').classList.contains('pl-9')).toBe(true)
  })
})
