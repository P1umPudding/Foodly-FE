import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { ListToolbar } from './ListToolbar'
import type { ListState } from '../../list/state'
import { DEFAULT_STATE } from '../../list/state'

const base: ListState = DEFAULT_STATE

// The shared TooltipProvider lives at the app root; supply one in isolation.
const renderToolbar = (state: ListState) =>
  render(
    <TooltipProvider>
      <ListToolbar state={state} set={() => undefined} />
    </TooltipProvider>,
  )

it('has a sort-criterion picker and a direction toggle', () => {
  renderToolbar(base)
  expect(screen.getByRole('combobox', { name: 'Sortierkriterium' })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Sortierrichtung/ })).toBeTruthy()
})

it('exposes density toggles by accessible name (icons only)', () => {
  renderToolbar({ ...base, detail: 'detailed' })
  expect(screen.getByRole('radio', { name: 'Detailliert' })).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'Kompakt' })).toBeTruthy()
})

it('exposes layout toggles (by-category / flat list)', () => {
  renderToolbar(base)
  expect(screen.getByRole('radio', { name: 'Nach Kategorie' })).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'Einfache Liste' })).toBeTruthy()
})

it('gives the view toggles the 3-px focus ring instead of postxl ring-1 (#95)', () => {
  renderToolbar(base)
  for (const name of ['Detailliert', 'Kompakt', 'Nach Kategorie', 'Einfache Liste']) {
    const classes = screen.getByRole('radio', { name }).className.split(/\s+/)
    expect(classes).toContain('focus-visible:ring-[3px]')
    expect(classes).not.toContain('focus-visible:ring-1')
  }
})
