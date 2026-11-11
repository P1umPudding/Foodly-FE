import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SortMenu } from './SortMenu'
import { DEFAULT_STATE, type ListState } from '../../list/state'

// Controlled like the page: patches merge into the state, and every patch is reported.
function Harness({ onSet, initial = DEFAULT_STATE }: { onSet?: (s: ListState) => void; initial?: ListState }) {
  const [state, setState] = useState(initial)
  return (
    <SortMenu
      state={state}
      set={(patch) => {
        const next = { ...state, ...patch }
        setState(next)
        onSet?.(next)
      }}
    />
  )
}

const trigger = () => screen.getByRole('button', { name: /^Sortieren:/ })

// Radix opens the menu on pointerdown/keydown, not click; jsdom has no pointer events, so use the keyboard.
async function openMenu() {
  fireEvent.keyDown(trigger(), { key: 'Enter' })
  return screen.findByRole('menu')
}

it('shows the criterion and the direction on the button', () => {
  render(<Harness />)
  expect(trigger().textContent).toContain('Name')
  expect(trigger().getAttribute('aria-label')).toBe('Sortieren: Name, A → Z')
})

it('keeps the 8-px gap between icon, label and chevron', () => {
  render(<Harness />)
  // jsdom applies no CSS: the un-merged buttonVariants this trigger used to get let base gap-2 beat sm's gap-1.5.
  expect(trigger().classList.contains('gap-2')).toBe(true)
  expect(trigger().classList.contains('gap-1.5')).toBe(false)
})

it('sets sortKey work and sortDir desc via "Arbeitszeit" + "Längste zuerst"', async () => {
  const onSet = vi.fn()
  render(<Harness onSet={onSet} />)

  fireEvent.click(within(await openMenu()).getByRole('menuitemradio', { name: 'Arbeitszeit' }))
  fireEvent.click(within(await openMenu()).getByRole('menuitemradio', { name: 'Längste zuerst' }))

  expect(onSet).toHaveBeenLastCalledWith(expect.objectContaining({ sortKey: 'work', sortDir: 'desc' }))
  expect(trigger().getAttribute('aria-label')).toBe('Sortieren: Arbeitszeit, Längste zuerst')
})

it('names both radio groups', async () => {
  render(<Harness />)
  const menu = await openMenu()
  within(menu).getByRole('group', { name: 'Sortieren nach' })
  within(menu).getByRole('group', { name: 'Richtung' })
})

it('marks the current criterion and direction as checked', async () => {
  render(<Harness initial={{ ...DEFAULT_STATE, sortKey: 'overall', sortDir: 'desc' }} />)
  const menu = await openMenu()
  expect(within(menu).getByRole('menuitemradio', { name: 'Gesamtzeit' }).getAttribute('aria-checked')).toBe('true')
  expect(within(menu).getByRole('menuitemradio', { name: 'Längste zuerst' }).getAttribute('aria-checked')).toBe('true')
})

it.each([
  ['name', ['A → Z', 'Z → A']],
  ['work', ['Kürzeste zuerst', 'Längste zuerst']],
  ['rating', ['Schlechteste zuerst', 'Beste zuerst']],
] as const)('words the direction for %s', async (sortKey, labels) => {
  render(<Harness initial={{ ...DEFAULT_STATE, sortKey }} />)
  const menu = await openMenu()
  const dirs = within(within(menu).getByRole('group', { name: 'Richtung' })).getAllByRole('menuitemradio')
  expect(dirs.map((d) => d.textContent)).toEqual(labels)
})
