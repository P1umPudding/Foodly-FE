import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResultCount } from './ResultCount'

describe('ResultCount', () => {
  it('renders "x von y Rezepten" when narrowed', () => {
    render(<ResultCount matching={3} total={12} />)
    expect(screen.getByText('3 von 12 Rezepten')).toBeTruthy()
  })

  it('renders the total with the noun when nothing is filtered out', () => {
    render(<ResultCount matching={12} total={12} />)
    expect(screen.getByText('12 Rezepte')).toBeTruthy()
  })

  it('uses the singular for one recipe', () => {
    render(<ResultCount matching={1} total={1} />)
    expect(screen.getByText('1 Rezept')).toBeTruthy()
  })

  it('uses the singular after "von" for a total of one', () => {
    render(<ResultCount matching={0} total={1} />)
    expect(screen.getByText('0 von 1 Rezept')).toBeTruthy()
  })
})
