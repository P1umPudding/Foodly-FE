import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageTitle } from './PageTitle'

describe('PageTitle', () => {
  it('renders an h1 at the mockup size, without .font-display', () => {
    render(<PageTitle>Guten Morgen</PageTitle>)
    const title = screen.getByRole('heading', { level: 1, name: 'Guten Morgen' })
    expect(title.className).toContain('text-2xl/[1.15]')
    expect(title.className).toContain('font-[650]')
    expect(title.className).toContain('tracking-[-0.025em]')
    expect(title.className.split(' ')).not.toContain('font-display')
  })

  it('takes extra classes from the caller', () => {
    render(<PageTitle className="text-cat-ink">Pasta</PageTitle>)
    expect(screen.getByRole('heading', { level: 1, name: 'Pasta' }).className).toContain('text-cat-ink')
  })
})
