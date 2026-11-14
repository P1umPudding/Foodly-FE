import { fireEvent, render, screen } from '@testing-library/react'
import { FolderOpen } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { redTokens } from '../test/redTokens'
import { EmptyState, ErrorState } from './StateCard'

describe('EmptyState', () => {
  it('shows the icon in a circle, the title, the sentence and the action', () => {
    render(
      <EmptyState icon={FolderOpen} title="Noch nichts hier" description="Ein Satz." action={<span>Aktion</span>} />,
    )
    expect(screen.getByTestId('state-icon').classList.contains('rounded-full')).toBe(true)
    expect(screen.getByText('Noch nichts hier')).toBeTruthy()
    expect(screen.getByText('Ein Satz.')).toBeTruthy()
    expect(screen.getByText('Aktion')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('leaves out the icon when compact', () => {
    render(<EmptyState icon={FolderOpen} title="Leer" compact />)
    expect(screen.queryByTestId('state-icon')).toBeNull()
  })
})

describe('ErrorState', () => {
  it('is a neutral alert card with a retry and an optional second action', () => {
    const onRetry = vi.fn()
    const { container } = render(
      <ErrorState
        title="Rezepte konnten nicht geladen werden"
        description="Server nicht erreichbar."
        onRetry={onRetry}
        extraAction={<a href="/recipes">Zur Liste</a>}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Rezepte konnten nicht geladen werden')
    expect(alert.textContent).toContain('Server nicht erreichbar.')
    expect(screen.getByText('Zur Liste')).toBeTruthy()
    expect(redTokens(container)).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
