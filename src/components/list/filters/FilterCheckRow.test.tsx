import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FilterCheckRow } from './FilterCheckRow'

describe('FilterCheckRow', () => {
  // design.md §2: rows are controls (rounded-md); rounded-sm stays with the checkbox itself.
  it('rounds the row like every other control', () => {
    render(
      <FilterCheckRow checked={false} onToggle={() => {}} data-testid="row">
        vegan
      </FilterCheckRow>,
    )
    const row = screen.getByTestId('row')
    expect(row.classList.contains('rounded-md')).toBe(true)
    expect(row.classList.contains('rounded-sm')).toBe(false)
  })

  it('ignores toggles while busy and keeps the box focusable', () => {
    const onToggle = vi.fn()
    render(
      <FilterCheckRow checked={false} onToggle={onToggle} busy>
        vegan
      </FilterCheckRow>,
    )
    const box = screen.getByRole('checkbox', { name: 'vegan' }) as HTMLInputElement
    fireEvent.click(box)
    expect(onToggle).not.toHaveBeenCalled()
    expect(box.checked).toBe(false)
    expect(box.getAttribute('aria-disabled')).toBe('true')
    expect(box.disabled).toBe(false)
  })
})
