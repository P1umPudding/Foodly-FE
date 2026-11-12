import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomeSection } from './HomeSection'
import type { SectionState } from './HomeSections'

function renderSection(state: SectionState, onRetry = vi.fn()) {
  return render(
    <MemoryRouter>
      <HomeSection
        title="Kategorien"
        link={{ label: 'Verwalten', to: '/categories' }}
        state={state}
        onRetry={onRetry}
        errorMessage="Server weg"
      >
        <p>section content</p>
      </HomeSection>
    </MemoryRouter>,
  )
}

describe('HomeSection', () => {
  it('shows a skeleton while loading', () => {
    renderSection('loading')
    expect(screen.getByRole('region', { name: 'Kategorien' }).getAttribute('aria-busy')).toBe('true')
    screen.getByRole('heading', { level: 2, name: 'Kategorien' })
    screen.getByTestId('home-section-skeleton')
    expect(screen.queryByText('section content')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Verwalten' })).toBeNull()
  })

  it('shows a retry alert on error', () => {
    const onRetry = vi.fn()
    renderSection('error', onRetry)
    screen.getByText('Konnte „Kategorien“ nicht laden')
    screen.getByText('Server weg')
    expect(screen.queryByText('section content')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders nothing when empty', () => {
    const { container } = renderSection('empty')
    expect(container.innerHTML).toBe('')
  })

  it('shows heading, link and content when ready', () => {
    renderSection('ready')
    screen.getByRole('region', { name: 'Kategorien' })
    expect(screen.getByRole('link', { name: 'Verwalten' }).getAttribute('href')).toBe('/categories')
    screen.getByText('section content')
    expect(screen.queryByTestId('home-section-skeleton')).toBeNull()
  })
})
