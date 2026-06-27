import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResultCount } from './ResultCount'

describe('ResultCount', () => {
  it('renders "x von y Rezepten" when narrowed', () => {
    render(<ResultCount matching={12} total={47} />)
    expect(screen.getByText('12 von 47 Rezepten')).toBeTruthy()
  })

  it('renders just the total when nothing is filtered out', () => {
    render(<ResultCount matching={47} total={47} />)
    expect(screen.getByText('47 Rezepte')).toBeTruthy()
  })
})
