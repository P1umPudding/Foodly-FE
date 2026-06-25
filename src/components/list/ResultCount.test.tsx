import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResultCount } from './ResultCount'

describe('ResultCount', () => {
  it('renders matching / total', () => {
    render(<ResultCount matching={12} total={47} />)
    expect(screen.getByText('12 / 47')).toBeTruthy()
  })
})
