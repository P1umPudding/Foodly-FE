import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { ListToolbar } from './ListToolbar'
import type { ListState } from '../../list/state'
import { DEFAULT_STATE } from '../../list/state'

const base: ListState = DEFAULT_STATE

// The shared TooltipProvider lives at the app root; supply one in isolation.
const renderToolbar = (state: ListState, set: (patch: Partial<ListState>) => void = () => undefined) =>
  render(
    <TooltipProvider>
      <ListToolbar state={state} set={set} />
    </TooltipProvider>,
  )

it('has a sort-criterion picker and a direction toggle', () => {
  renderToolbar(base)
  expect(screen.getByRole('combobox', { name: 'Sortierkriterium' })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Sortierrichtung/ })).toBeTruthy()
})
