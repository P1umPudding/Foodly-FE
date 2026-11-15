import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

it('is as wide as its content and 38 px high like the toolbar', () => {
  render(<Harness />)
  const classes = trigger().className.split(/\s+/)
  // jsdom applies no CSS: check the tokens. sm's gap-1.5 / px-2.5 are the mockup button's 6 px and 10 px.
  expect(classes).toEqual(expect.arrayContaining(['h-[38px]', 'gap-1.5', 'text-base']))
  // No invisible sizers reserving the widest criterion any more: the label is the only text.
  expect(trigger().querySelector('.invisible')).toBeNull()
  expect(trigger().textContent).toBe('Name')
})

it('lists the criteria without group headings, the current one with a check', async () => {
  render(<Harness initial={{ ...DEFAULT_STATE, sortKey: 'overall', sortDir: 'desc' }} />)
  const menu = await openMenu()
  expect(within(menu).queryByText('Sortieren nach')).toBeNull()
  expect(within(menu).queryByText('Richtung')).toBeNull()

  const criteria = within(within(menu).getByRole('group', { name: 'Sortieren nach' })).getAllByRole('menuitemradio')
  expect(criteria.map((c) => c.textContent)).toEqual(['Name', 'Arbeitszeit', 'Gesamtzeit', 'Bewertung'])
  const checked = criteria.filter((c) => c.getAttribute('aria-checked') === 'true')
  expect(checked.map((c) => c.textContent)).toEqual(['Gesamtzeit'])
  expect(within(menu).getAllByTestId('sort-check')).toHaveLength(1)
  expect(within(checked[0]).getByTestId('sort-check')).toBeTruthy()
  expect(checked[0].className.split(/\s+/)).toEqual(expect.arrayContaining(['font-medium', 'text-foreground']))
  expect(criteria[0].className.split(/\s+/)).toContain('text-muted-foreground')
})

it('starts "Bewertung" best first and "Name" A → Z, whatever the direction was', async () => {
  const onSet = vi.fn()
  render(<Harness onSet={onSet} />)
  const menu = await openMenu()

  fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Bewertung' }))
  expect(onSet).toHaveBeenLastCalledWith(expect.objectContaining({ sortKey: 'rating', sortDir: 'desc' }))
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Name' }))
  expect(onSet).toHaveBeenLastCalledWith(expect.objectContaining({ sortKey: 'name', sortDir: 'asc' }))
})

it('resets the direction when the current criterion is picked again', async () => {
  const onSet = vi.fn()
  render(<Harness onSet={onSet} initial={{ ...DEFAULT_STATE, sortKey: 'rating', sortDir: 'asc' }} />)
  fireEvent.click(within(await openMenu()).getByRole('menuitemradio', { name: 'Bewertung' }))
  expect(onSet).toHaveBeenLastCalledWith(expect.objectContaining({ sortKey: 'rating', sortDir: 'desc' }))
})

it('stays open after a pick so the direction can follow', async () => {
  const onSet = vi.fn()
  render(<Harness onSet={onSet} />)
  const menu = await openMenu()

  fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Arbeitszeit' }))
  expect(screen.getByRole('menu')).toBe(menu)
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Längste zuerst' }))
  expect(screen.getByRole('menu')).toBe(menu)

  expect(onSet).toHaveBeenLastCalledWith(expect.objectContaining({ sortKey: 'work', sortDir: 'desc' }))
  // The open (modal) menu hides the rest of the page from the accessibility tree.
  expect(screen.getByRole('button', { name: /^Sortieren:/, hidden: true }).getAttribute('aria-label')).toBe(
    'Sortieren: Arbeitszeit, Längste zuerst',
  )
})

it('draws the direction as a segment, the current one raised', async () => {
  render(<Harness initial={{ ...DEFAULT_STATE, sortDir: 'desc' }} />)
  const menu = await openMenu()
  const group = within(menu).getByRole('group', { name: 'Richtung' })
  expect(group.className.split(/\s+/)).toEqual(expect.arrayContaining(['bg-seg', 'p-0.5', 'rounded-lg']))
  const on = within(group).getByRole('menuitemradio', { name: 'Z → A' })
  expect(on.getAttribute('aria-checked')).toBe('true')
  expect(on.className.split(/\s+/)).toEqual(expect.arrayContaining(['bg-card', 'shadow-seg']))
  // Keyboard focus shows as a ring on both segments (a fill would vanish on the track or the raised segment). The
  // focus-visible ring-ring/50 pair is what styles.css raises to the full --ring token (#77).
  for (const item of within(group).getAllByRole('menuitemradio')) {
    expect(item.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['focus-visible:ring-[3px]', 'focus-visible:ring-ring/50']),
    )
  }
})

it('reaches the direction by keyboard from the criteria', async () => {
  render(<Harness />)
  const menu = await openMenu()
  // Opening by keyboard focuses the first criterion; four steps down pass the other three.
  const items = within(menu).getAllByRole('menuitemradio')
  // Radix moves the roving focus in a timeout, so wait for each step.
  for (let i = 1; i <= 4; i++) {
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    await waitFor(() => expect(document.activeElement).toBe(items[i]))
  }
  expect(document.activeElement).toBe(within(menu).getByRole('menuitemradio', { name: 'A → Z' }))
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
