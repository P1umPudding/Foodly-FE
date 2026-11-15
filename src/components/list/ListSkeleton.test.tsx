import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListSkeleton } from './ListSkeleton'

describe('ListSkeleton rows', () => {
  it('draws a name and a meta bar per detailed row, at the row pitch', () => {
    render(<ListSkeleton detail="detailed" count={2} />)
    const rows = screen.getAllByTestId('row-skeleton')
    expect(rows).toHaveLength(2)
    expect(rows[0].classList.contains('h-14')).toBe(true)
    expect(rows[0].querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2)
  })

  it('draws only the name bar in compact rows', () => {
    render(<ListSkeleton detail="compact" count={1} testId="list" />)
    const row = within(screen.getByTestId('list')).getByTestId('row-skeleton')
    expect(row.classList.contains('h-8')).toBe(true)
    expect(row.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(1)
  })
})
