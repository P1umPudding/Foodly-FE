import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MobileListOptions } from './MobileListOptions'
import { DEFAULT_STATE, type ListState } from '../../list/state'

// Controlled like the page: patches merge into the state, and every patch is reported.
function Harness({
  onSet,
  initial = DEFAULT_STATE,
  showLayout,
}: {
  onSet?: (p: Partial<ListState>) => void
  initial?: ListState
  showLayout?: boolean
}) {
  const [state, setState] = useState(initial)
  return (
    <MobileListOptions
      state={state}
      showLayout={showLayout}
      set={(patch) => {
        setState((s) => ({ ...s, ...patch }))
        onSet?.(patch)
      }}
    />
  )
}

const button = () => screen.getByRole('button', { name: 'Sortieren und Ansicht' })
const openSheet = () => {
  fireEvent.click(button())
  return screen.getByRole('dialog', { name: 'Sortieren & Ansicht' })
}
const classes = (el: Element) => el.className.split(/\s+/)

it('is a 40 px sliders button labelled "Sortieren und Ansicht"', () => {
  render(<Harness />)
  expect(button().classList.contains('size-10')).toBe(true)
  expect(button().textContent).toBe('')
  expect(button().querySelector('svg.lucide-sliders-horizontal')).toBeTruthy()
  // The shared TriggerButton (#133), not the bare Radix trigger restyled with buttonVariants. Only works for
  // SheetTrigger: DropdownMenuTrigger passes its own data-slot, which wins over TriggerButton's.
  expect(button().getAttribute('data-slot')).toBe('button')
})

it('holds "Sortieren nach", "Ansicht" and "Gliederung" in the mockup order', () => {
  render(<Harness />)
  const sheet = openSheet()
  expect(
    within(sheet)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent),
  ).toEqual(['Sortieren nach', 'Ansicht', 'Gliederung'])
  const names = (name: string) =>
    within(within(sheet).getByRole('group', { name }))
      .getAllByRole('radio')
      .map((r) => r.textContent)

  expect(names('Sortieren nach')).toEqual(['Name', 'Arbeitszeit', 'Gesamtzeit', 'Bewertung'])
  expect(names('Richtung')).toEqual(['A → Z', 'Z → A'])
  expect(names('Ansicht')).toEqual(['Kompakt', 'Detailliert', 'Kacheln'])
  expect(names('Gliederung')).toEqual(['Nach Kategorie', 'Einfache Liste'])
  // No "Anzeigen": choices apply as they are made.
  expect(within(sheet).queryByRole('button', { name: 'Anzeigen' })).toBeNull()
})

it('draws direction, view and layout as full-width segments, view and layout with icons', () => {
  render(<Harness />)
  const sheet = openSheet()
  for (const name of ['Richtung', 'Ansicht', 'Gliederung']) {
    expect(classes(within(sheet).getByRole('group', { name }))).toEqual(
      expect.arrayContaining(['bg-seg', 'p-0.5', 'w-full']),
    )
  }
  for (const radio of within(within(sheet).getByRole('group', { name: 'Ansicht' })).getAllByRole('radio')) {
    expect(radio.querySelector('svg')).toBeTruthy()
    expect(classes(radio)).toContain('flex-1')
  }
  const on = within(sheet).getByRole('radio', { name: 'Detailliert' })
  expect(classes(on)).toEqual(expect.arrayContaining(['bg-card', 'shadow-seg']))
})

it('lists the criteria like the menu: the current one with a check, in fg/500', () => {
  render(<Harness initial={{ ...DEFAULT_STATE, sortKey: 'work' }} />)
  const sheet = openSheet()
  const current = within(sheet).getByRole('radio', { name: 'Arbeitszeit' })
  expect(current.getAttribute('aria-checked')).toBe('true')
  expect(within(sheet).getAllByTestId('sort-check')).toHaveLength(1)
  expect(within(current).getByTestId('sort-check')).toBeTruthy()
  expect(classes(current)).toEqual(expect.arrayContaining(['font-medium', 'text-foreground']))
  expect(classes(within(sheet).getByRole('radio', { name: 'Name' }))).toContain('text-muted-foreground')
})

it('applies each choice at once and stays open', () => {
  const onSet = vi.fn()
  render(<Harness onSet={onSet} />)
  const sheet = openSheet()

  fireEvent.click(within(sheet).getByRole('radio', { name: 'Kacheln' }))
  expect(onSet).toHaveBeenLastCalledWith({ detail: 'tiles' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Gesamtzeit' }))
  expect(onSet).toHaveBeenLastCalledWith({ sortKey: 'overall', sortDir: 'asc' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Längste zuerst' }))
  expect(onSet).toHaveBeenLastCalledWith({ sortDir: 'desc' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Einfache Liste' }))
  expect(onSet).toHaveBeenLastCalledWith({ grouped: false })

  expect(screen.getByRole('dialog', { name: 'Sortieren & Ansicht' })).toBe(sheet)
  expect(within(sheet).getByRole('radio', { name: 'Kacheln' }).getAttribute('aria-checked')).toBe('true')
})

it('starts "Bewertung" best first and "Name" A → Z, also when the current one is tapped again', () => {
  const onSet = vi.fn()
  render(<Harness onSet={onSet} initial={{ ...DEFAULT_STATE, sortDir: 'desc' }} />)
  const sheet = openSheet()

  fireEvent.click(within(sheet).getByRole('radio', { name: 'Bewertung' }))
  expect(onSet).toHaveBeenLastCalledWith({ sortKey: 'rating', sortDir: 'desc' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Schlechteste zuerst' }))
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Bewertung' }))
  expect(onSet).toHaveBeenLastCalledWith({ sortKey: 'rating', sortDir: 'desc' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Name' }))
  expect(onSet).toHaveBeenLastCalledWith({ sortKey: 'name', sortDir: 'asc' })
})

it('words the direction for the chosen criterion', () => {
  render(<Harness initial={{ ...DEFAULT_STATE, sortKey: 'rating' }} />)
  const sheet = openSheet()
  within(sheet).getByRole('radio', { name: 'Schlechteste zuerst' })
  within(sheet).getByRole('radio', { name: 'Beste zuerst' })
})

it('gives every option a 40 px tap target', () => {
  render(<Harness />)
  const sheet = openSheet()
  // jsdom applies no CSS: criteria rows and segments are both h-10 (the segment track adds 2 px around them).
  for (const radio of within(within(sheet).getByRole('group', { name: 'Sortieren nach' })).getAllByRole('radio')) {
    expect(classes(radio)).toContain('h-10')
  }
  for (const name of ['Richtung', 'Ansicht', 'Gliederung']) {
    for (const radio of within(within(sheet).getByRole('group', { name })).getAllByRole('radio')) {
      expect(classes(radio)).toContain('h-10')
    }
  }
})

it('leaves out the layout when the page has none (category page)', () => {
  render(<Harness showLayout={false} />)
  const sheet = openSheet()
  expect(within(sheet).queryByRole('group', { name: 'Gliederung' })).toBeNull()
  expect(within(sheet).getByRole('group', { name: 'Ansicht' })).toBeTruthy()
})
