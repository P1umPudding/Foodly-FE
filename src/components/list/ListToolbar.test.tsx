import { fireEvent, render, screen, within } from '@testing-library/react'
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

it('offers the views in the order Kompakt, Detailliert, Kacheln (icons only)', () => {
  renderToolbar({ ...base, detail: 'detailed' })
  const views = within(screen.getByRole('group', { name: 'Ansicht' })).getAllByRole('radio')
  expect(views.map((r) => r.getAttribute('aria-label'))).toEqual(['Kompakt', 'Detailliert', 'Kacheln'])
})

it('switches to the tiles view', () => {
  const set = vi.fn()
  renderToolbar(base, set)
  fireEvent.click(screen.getByRole('radio', { name: 'Kacheln' }))
  expect(set).toHaveBeenCalledWith({ detail: 'tiles' })
})

it('exposes layout toggles (by-category / flat list)', () => {
  renderToolbar(base)
  expect(screen.getByRole('radio', { name: 'Nach Kategorie' })).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'Einfache Liste' })).toBeTruthy()
})

it('gives the view toggles the 3-px focus ring instead of postxl ring-1 (#95)', () => {
  renderToolbar(base)
  for (const name of ['Kompakt', 'Detailliert', 'Kacheln', 'Nach Kategorie', 'Einfache Liste']) {
    const classes = screen.getByRole('radio', { name }).className.split(/\s+/)
    expect(classes).toContain('focus-visible:ring-[3px]')
    expect(classes).not.toContain('focus-visible:ring-1')
  }
})
