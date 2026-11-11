import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MobileListOptions } from './MobileListOptions'
import { DEFAULT_STATE, type ListState } from '../../list/state'

// Controlled like the page: patches merge into the state, and every patch is reported.
function Harness({ onSet, initial = DEFAULT_STATE }: { onSet?: (p: Partial<ListState>) => void; initial?: ListState }) {
  const [state, setState] = useState(initial)
  return (
    <MobileListOptions
      state={state}
      set={(patch) => {
        setState((s) => ({ ...s, ...patch }))
        onSet?.(patch)
      }}
    />
  )
}

const openSheet = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Sortieren & Ansicht' }))
  return screen.getByRole('dialog', { name: 'Sortieren & Ansicht' })
}

it('is a 40 px icon button labelled "Sortieren & Ansicht"', () => {
  render(<Harness />)
  const button = screen.getByRole('button', { name: 'Sortieren & Ansicht' })
  expect(button.classList.contains('size-10')).toBe(true)
  expect(button.textContent).toBe('')
  // The shared TriggerButton (#133), not the bare Radix trigger restyled with buttonVariants. Only works for
  // SheetTrigger: DropdownMenuTrigger passes its own data-slot, which wins over TriggerButton's.
  expect(button.getAttribute('data-slot')).toBe('button')
})

it('holds criterion, direction, view and layout', () => {
  render(<Harness />)
  const sheet = openSheet()
  // Label texts in order (the radios' accessible names; the icons are aria-hidden).
  const labels = (name: string) =>
    within(within(sheet).getByRole('radiogroup', { name }))
      .getAllByRole('radio')
      .map((r) => sheet.querySelector(`label[for="${r.id}"]`)?.textContent)

  expect(labels('Sortieren nach')).toEqual(['Name', 'Arbeitszeit', 'Gesamtzeit', 'Bewertung'])
  expect(labels('Richtung')).toEqual(['A → Z', 'Z → A'])
  expect(labels('Ansicht')).toEqual(['Kompakt', 'Detailliert', 'Kacheln'])
  expect(labels('Gliederung')).toEqual(['Nach Kategorie', 'Einfache Liste'])
  // No "Anzeigen": choices apply as they are made.
  expect(within(sheet).queryByRole('button', { name: 'Anzeigen' })).toBeNull()
})

it('applies each choice at once and stays open', () => {
  const onSet = vi.fn()
  render(<Harness onSet={onSet} />)
  const sheet = openSheet()

  fireEvent.click(within(sheet).getByRole('radio', { name: 'Kacheln' }))
  expect(onSet).toHaveBeenLastCalledWith({ detail: 'tiles' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Gesamtzeit' }))
  expect(onSet).toHaveBeenLastCalledWith({ sortKey: 'overall' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Längste zuerst' }))
  expect(onSet).toHaveBeenLastCalledWith({ sortDir: 'desc' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Einfache Liste' }))
  expect(onSet).toHaveBeenLastCalledWith({ grouped: false })

  expect(screen.getByRole('dialog', { name: 'Sortieren & Ansicht' })).toBe(sheet)
  expect(within(sheet).getByRole('radio', { name: 'Kacheln' }).getAttribute('aria-checked')).toBe('true')
})

it('words the direction for the chosen criterion', () => {
  render(<Harness initial={{ ...DEFAULT_STATE, sortKey: 'rating' }} />)
  const sheet = openSheet()
  within(sheet).getByRole('radio', { name: 'Schlechteste zuerst' })
  within(sheet).getByRole('radio', { name: 'Beste zuerst' })
})

it('gives every option row a 40 px tap target', () => {
  render(<Harness />)
  const sheet = openSheet()
  // jsdom applies no CSS: check the row's token.
  for (const radio of within(sheet).getAllByRole('radio')) {
    expect(radio.closest('.min-h-10')).not.toBeNull()
  }
})
