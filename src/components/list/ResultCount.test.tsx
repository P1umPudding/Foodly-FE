import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResultCount } from './ResultCount'

describe('ResultCount', () => {
  it('renders zero with the plural noun', () => {
    render(<ResultCount count={0} more={false} />)
    expect(screen.getByText('0 Rezepte')).toBeTruthy()
  })

  it('uses the singular for one recipe', () => {
    render(<ResultCount count={1} more={false} />)
    expect(screen.getByText('1 Rezept')).toBeTruthy()
  })

  it('renders the visible count', () => {
    render(<ResultCount count={14} more={false} />)
    expect(screen.getByText('14 Rezepte')).toBeTruthy()
  })

  it('marks the count as a lower bound while more pages may follow', () => {
    render(<ResultCount count={14} more />)
    expect(screen.getByText('14+ Rezepte')).toBeTruthy()
  })

  it('uses the plural for "1+" (at least one)', () => {
    render(<ResultCount count={1} more />)
    expect(screen.getByText('1+ Rezepte')).toBeTruthy()
  })

  it('shows and announces nothing while no recipe is visible yet but more pages may follow', () => {
    const { container } = render(<ResultCount count={0} more />)
    const span = container.querySelector('span')!
    expect(span.getAttribute('aria-hidden')).toBe('true')
    expect(span.classList.contains('invisible')).toBe(true)
  })

  it('never claims a total ("von")', () => {
    for (const [count, more] of [
      [0, false],
      [1, false],
      [3, false],
      [14, true],
    ] as const) {
      const { container, unmount } = render(<ResultCount count={count} more={more} />)
      expect(container.textContent).not.toContain('von')
      unmount()
    }
  })
})
