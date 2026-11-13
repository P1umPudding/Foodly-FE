import { fireEvent, render, screen, within } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { ViewToggles } from './ViewToggles'
import type { ListState } from '../../list/state'
import { DEFAULT_STATE } from '../../list/state'

const base: ListState = DEFAULT_STATE

// The shared TooltipProvider lives at the app root; supply one in isolation.
const renderToggles = (state: ListState, set: (patch: Partial<ListState>) => void = () => undefined) =>
  render(
    <TooltipProvider>
      <ViewToggles state={state} set={set} />
    </TooltipProvider>,
  )

it('offers the views in the order Kompakt, Detailliert, Kacheln (icons only)', () => {
  renderToggles({ ...base, detail: 'detailed' })
  const views = within(screen.getByRole('group', { name: 'Ansicht' })).getAllByRole('radio')
  expect(views.map((r) => r.getAttribute('aria-label'))).toEqual(['Kompakt', 'Detailliert', 'Kacheln'])
})

it('switches to the tiles view', () => {
  const set = vi.fn()
  renderToggles(base, set)
  fireEvent.click(screen.getByRole('radio', { name: 'Kacheln' }))
  expect(set).toHaveBeenCalledWith({ detail: 'tiles' })
})

it('exposes layout toggles (by-category / flat list)', () => {
  const set = vi.fn()
  renderToggles({ ...base, grouped: true }, set)
  expect(screen.getByRole('radio', { name: 'Nach Kategorie' })).toBeTruthy()
  fireEvent.click(screen.getByRole('radio', { name: 'Einfache Liste' }))
  expect(set).toHaveBeenCalledWith({ grouped: false })
})

it('gives the view toggles the 3-px focus ring instead of postxl ring-1 (#95)', () => {
  renderToggles(base)
  for (const name of ['Kompakt', 'Detailliert', 'Kacheln', 'Nach Kategorie', 'Einfache Liste']) {
    const classes = screen.getByRole('radio', { name }).className.split(/\s+/)
    expect(classes).toContain('focus-visible:ring-[3px]')
    expect(classes).not.toContain('focus-visible:ring-1')
  }
})

it('leaves out the layout toggles when the page has none (category page)', () => {
  render(
    <TooltipProvider>
      <ViewToggles state={base} set={() => undefined} showLayout={false} />
    </TooltipProvider>,
  )
  expect(screen.queryByRole('group', { name: 'Gliederung' })).toBeNull()
  expect(screen.getByRole('group', { name: 'Ansicht' })).toBeTruthy()
})

// Radix's single ToggleGroup renders radios (aria-checked); the wrapping Tooltip owns data-state, so the look hangs on
// a JS flag, which the classes below check.
it('renders each group as a segment track with the active segment as a raised surface', () => {
  renderToggles({ ...base, detail: 'detailed' })
  const group = screen.getByRole('group', { name: 'Ansicht' })
  expect(group.className.split(/\s+/)).toEqual(expect.arrayContaining(['bg-seg', 'p-0.5', 'rounded-lg']))

  const active = screen.getByRole('radio', { name: 'Detailliert' })
  expect(active.getAttribute('aria-checked')).toBe('true')
  expect(active.className.split(/\s+/)).toEqual(expect.arrayContaining(['bg-card', 'shadow-seg', 'text-foreground']))

  const inactive = screen.getByRole('radio', { name: 'Kompakt' })
  expect(inactive.getAttribute('aria-checked')).toBe('false')
  expect(inactive.className.split(/\s+/)).toContain('text-muted-foreground')
  expect(inactive.className.split(/\s+/)).not.toContain('bg-card')
})
