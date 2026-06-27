import { render, screen } from '@testing-library/react'
import { ListToolbar } from './ListToolbar'
import type { ListState } from '../../list/state'
import { DEFAULT_STATE } from '../../list/state'

const base: ListState = DEFAULT_STATE

it('sort trigger has aria-label "Sortierung"', () => {
  render(<ListToolbar state={base} set={() => undefined} />)
  expect(screen.getByRole('combobox', { name: 'Sortierung' })).toBeTruthy()
})

it('shows active detail label "Detailliert" when detail is detailed', () => {
  render(<ListToolbar state={{ ...base, detail: 'detailed' }} set={() => undefined} />)
  expect(screen.getByText('Detailliert')).toBeTruthy()
})

it('shows active detail label "Kompakt" when detail is compact', () => {
  render(<ListToolbar state={{ ...base, detail: 'compact' }} set={() => undefined} />)
  expect(screen.getByText('Kompakt')).toBeTruthy()
})

it('does not show "Kompakt" text when detail is detailed', () => {
  render(<ListToolbar state={{ ...base, detail: 'detailed' }} set={() => undefined} />)
  expect(screen.queryByText('Kompakt')).toBeNull()
})
