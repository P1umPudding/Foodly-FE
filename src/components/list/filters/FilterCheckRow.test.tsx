import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
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
})
