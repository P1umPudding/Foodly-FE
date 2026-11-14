import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SectionHeader } from './SectionHeader'

function renderHeader(link?: { label: string; to: string }) {
  return render(
    <MemoryRouter>
      <SectionHeader id="sec" title="Kategorien" link={link} />
    </MemoryRouter>,
  )
}

describe('SectionHeader', () => {
  it('renders an h2 with the given id at 15/600', () => {
    renderHeader()
    const heading = screen.getByRole('heading', { level: 2, name: 'Kategorien' })
    expect(heading.id).toBe('sec')
    expect(heading.className).toContain('text-lg')
    expect(heading.className).toContain('font-semibold')
  })

  it('shows the optional link as quiet 13/500 text with a touch-size target', () => {
    renderHeader({ label: 'Verwalten', to: '/categories' })
    const link = screen.getByRole('link', { name: 'Verwalten' })
    expect(link.getAttribute('href')).toBe('/categories')
    expect(link.className).toContain('text-sm')
    expect(link.className).toContain('font-medium')
    expect(link.className).toContain('text-muted-foreground')
    expect(link.className).toContain('touch:min-h-10')
    expect(link.className).not.toContain('underline')
  })

  it('renders no link when none is given', () => {
    renderHeader()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
