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
