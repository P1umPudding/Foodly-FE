import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SectionEditor } from './SectionEditor'
import { setViewport } from '../../test/viewport'
import type { DraftSection } from '../../editor/draft'

vi.mock('../../catalog/CatalogProvider', () => ({
  useIngredients: () => ({
    byId: { 1: { id: 1, name: 'Zwiebel' }, 2: { id: 2, name: 'Salz' }, 3: { id: 3, name: 'Olivenöl' } },
    status: 'ready',
  }),
  useTags: () => ({ byId: {} }),
}))

const section: DraftSection = {
  key: 1,
  name: 'Sugo',
  ingredients: [
    { key: 10, ingredient: 1, text: '', amount: '1', unit: '' },
    { key: 11, ingredient: null, text: 'Salz', amount: '', unit: '' },
  ],
  steps: [
    { key: 20, text: 'Hacken.' },
    { key: 21, text: 'Braten.' },
  ],
}

const openMenu = async (label: string) => {
  fireEvent.keyDown(screen.getByRole('button', { name: label }), { key: 'Enter' })
  return screen.findByRole('menu')
}

function setup(onChange = vi.fn(), value = section) {
  render(
    <TooltipProvider>
      <SectionEditor
        section={value}
        index={0}
        total={1}
        onChange={onChange}
        onUp={vi.fn()}
        onDown={vi.fn()}
        onRemove={vi.fn()}
      />
    </TooltipProvider>,
  )
  return onChange
}

describe('SectionEditor', () => {
  it('shows the ingredients as a table with the four column headers', () => {
    setup()

    const head = screen.getByText('Menge').parentElement as HTMLElement
    expect(Array.from(head.children).map((c) => c.textContent)).toEqual(['Menge', 'Einheit', 'Zutat', 'Zusatz'])
    expect(within(head).queryByRole('textbox')).toBeNull()
  })

  it('leaves out the column headers while there are no ingredients', () => {
    setup(vi.fn(), { ...section, ingredients: [] })

    expect(screen.queryByText('Menge')).toBeNull()
  })

  it('moves an ingredient down via its ⋮ menu', async () => {
    const onChange = setup()

    const menu = await openMenu('Zutat 1: Aktionen')
    expect(within(menu).getByRole('menuitem', { name: 'Nach oben' }).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Nach unten' }))

    expect(onChange.mock.calls[0][0].ingredients.map((i: { key: number }) => i.key)).toEqual([11, 10])
  })

  it('removes an ingredient via its ⋮ menu', async () => {
    const onChange = setup()

    fireEvent.click(within(await openMenu('Zutat 2: Aktionen')).getByRole('menuitem', { name: 'Entfernen' }))

    expect(onChange.mock.calls[0][0].ingredients.map((i: { key: number }) => i.key)).toEqual([10])
  })

  it('adds an ingredient row', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: /zutat hinzufügen/i }))

    expect(onChange.mock.calls[0][0].ingredients).toHaveLength(3)
  })

  it('adds a step', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: /schritt hinzufügen/i }))

    expect(onChange.mock.calls[0][0].steps).toHaveLength(3)
  })

  it('moves a step down via its ⋮ menu', async () => {
    const onChange = setup()

    fireEvent.click(within(await openMenu('Schritt 1: Aktionen')).getByRole('menuitem', { name: 'Nach unten' }))

    expect(onChange.mock.calls[0][0].steps.map((s: { text: string }) => s.text)).toEqual(['Braten.', 'Hacken.'])
  })

  it('removes a step via its ⋮ menu', async () => {
    const onChange = setup()

    fireEvent.click(within(await openMenu('Schritt 2: Aktionen')).getByRole('menuitem', { name: 'Entfernen' }))

    expect(onChange.mock.calls[0][0].steps.map((s: { text: string }) => s.text)).toEqual(['Hacken.'])
  })

  it('moves and removes the section via its ⋯ menu', async () => {
    const onUp = vi.fn()
    const onRemove = vi.fn()
    render(
      <TooltipProvider>
        <SectionEditor
          section={section}
          index={1}
          total={2}
          onChange={vi.fn()}
          onUp={onUp}
          onDown={vi.fn()}
          onRemove={onRemove}
        />
      </TooltipProvider>,
    )

    let menu = await openMenu('Abschnitt 2: Aktionen')
    expect(within(menu).getByRole('menuitem', { name: 'Nach unten' }).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Nach oben' }))
    expect(onUp).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

    menu = await openMenu('Abschnitt 2: Aktionen')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Entfernen' }))
    expect(onRemove).toHaveBeenCalled()
  })

  it('has no separate arrow or bin buttons in its rows', () => {
    setup()

    expect(screen.queryByRole('button', { name: /nach oben|nach unten|entfernen/i })).toBeNull()
  })

  it('shows the timer hint only where asked (the first section)', () => {
    const { unmount } = render(
      <TooltipProvider>
        <SectionEditor
          section={section}
          index={0}
          total={1}
          showTimerHint
          onChange={vi.fn()}
          onUp={vi.fn()}
          onDown={vi.fn()}
          onRemove={vi.fn()}
        />
      </TooltipProvider>,
    )
    expect(screen.getByText(/werden im Rezept zu Timern/)).toBeTruthy()
    unmount()

    setup()
    expect(screen.queryByText(/werden im Rezept zu Timern/)).toBeNull()
  })

  it('names an unnamed section "Abschnitt ohne Namen"', () => {
    setup(vi.fn(), { ...section, name: '' })
    expect(screen.getByPlaceholderText('Abschnitt ohne Namen')).toBeTruthy()
  })

  it.each([
    ['Zutat 2: Aktionen', 'Zutat hinzufügen'],
    ['Schritt 2: Aktionen', 'Schritt hinzufügen'],
  ])('puts focus on its add button after "Entfernen" in %s', async (trigger, addButton) => {
    setup()

    fireEvent.click(within(await openMenu(trigger)).getByRole('menuitem', { name: 'Entfernen' }))

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: addButton })))
  })

  it('edits the section name', () => {
    const onChange = setup()

    fireEvent.change(screen.getByLabelText('Abschnittsname'), { target: { value: 'Teig' } })

    expect(onChange.mock.calls[0][0].name).toBe('Teig')
  })
})

describe('SectionEditor: Mehrere einfügen', () => {
  afterEach(() => setViewport(1024))

  const lines = '500 g Hackfleisch\n\n2 EL Olivenöl\nSalz nach Geschmack'
  const openPaste = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Mehrere einfügen' }))
    return screen.getByRole('textbox', { name: 'Zutaten, eine pro Zeile' })
  }
  const added = [
    { ingredient: null, text: 'Hackfleisch', amount: '500', unit: 'g' },
    { ingredient: 3, text: '', amount: '2', unit: 'EL' },
    { ingredient: 2, text: 'nach Geschmack', amount: '', unit: '' },
  ]
  const withoutKeys = (rows: { key: number }[]) => rows.map(({ key: _key, ...rest }) => rest)

  it('appends one ingredient per pasted line', async () => {
    const onChange = setup()

    const field = openPaste()
    await waitFor(() => expect(document.activeElement).toBe(field))
    expect(screen.getByRole('dialog', { name: 'Mehrere Zutaten einfügen' })).toBeTruthy()
    const insert = screen.getByRole('button', { name: 'Einfügen' }) as HTMLButtonElement
    expect(insert.disabled).toBe(true)
    fireEvent.change(field, { target: { value: '  \n ' } })
    expect(insert.disabled).toBe(true)
    fireEvent.change(field, { target: { value: lines } })
    fireEvent.click(insert)

    const rows = onChange.mock.calls[0][0].ingredients
    expect(rows.slice(0, 2)).toEqual(section.ingredients)
    expect(withoutKeys(rows.slice(2))).toEqual(added)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mehrere einfügen' }))
  })

  it('replaces the empty placeholder row of a new section', () => {
    const onChange = setup(vi.fn(), {
      ...section,
      ingredients: [{ key: 30, ingredient: null, text: '', amount: '', unit: '' }],
    })

    fireEvent.change(openPaste(), { target: { value: lines } })
    fireEvent.click(screen.getByRole('button', { name: 'Einfügen' }))

    expect(withoutKeys(onChange.mock.calls[0][0].ingredients)).toEqual(added)
  })

  it('changes nothing on „Abbrechen“ and starts empty on the next opening', async () => {
    const onChange = setup()

    fireEvent.change(openPaste(), { target: { value: lines } })
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    expect(onChange).not.toHaveBeenCalled()
    expect((openPaste() as HTMLTextAreaElement).value).toBe('')
  })

  it('uses a bottom sheet on the phone', async () => {
    setViewport(600)
    const onChange = setup()

    const field = openPaste()
    await waitFor(() => expect(document.activeElement).toBe(field))
    expect(screen.getByRole('dialog', { name: 'Mehrere Zutaten einfügen' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Schließen' })).toBeTruthy()
    fireEvent.change(field, { target: { value: lines } })
    fireEvent.click(screen.getByRole('button', { name: 'Einfügen' }))

    expect(withoutKeys(onChange.mock.calls[0][0].ingredients.slice(2))).toEqual(added)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mehrere einfügen' }))
  })

  it('stays open on an outside click once text was entered', async () => {
    setup()

    const field = openPaste()
    await waitFor(() => expect(document.activeElement).toBe(field))
    fireEvent.change(field, { target: { value: lines } })
    await new Promise((r) => setTimeout(r, 10))
    fireEvent.pointerDown(document.body)
    await new Promise((r) => setTimeout(r, 50))

    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('closes on an outside click while empty', async () => {
    setup()

    const field = openPaste()
    await waitFor(() => expect(document.activeElement).toBe(field))
    // Radix registers its outside-pointer listener a tick after mounting.
    await new Promise((r) => setTimeout(r, 10))
    fireEvent.pointerDown(document.body)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('closes on Escape without changes', async () => {
    const onChange = setup()

    const field = openPaste()
    fireEvent.change(field, { target: { value: lines } })
    fireEvent.keyDown(field, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('SectionEditor on the phone', () => {
  afterEach(() => setViewport(1024))

  const phone: DraftSection = {
    ...section,
    ingredients: [
      { key: 30, ingredient: 1, text: 'gehackt', amount: 'ca. 800', unit: 'g' },
      { key: 31, ingredient: null, text: 'Salz', amount: '', unit: '' },
      { key: 32, ingredient: 3, text: '', amount: '2', unit: 'EL' },
    ],
  }

  // Controlled like RecipeEditor, so the rows and the sheet follow each change.
  function Harness({ initial, onChange }: { initial: DraftSection; onChange: (next: DraftSection) => void }) {
    const [value, setValue] = useState(initial)
    return (
      <SectionEditor
        section={value}
        index={0}
        total={1}
        onChange={(next) => {
          onChange(next)
          setValue(next)
        }}
        onUp={vi.fn()}
        onDown={vi.fn()}
        onRemove={vi.fn()}
      />
    )
  }

  function setupPhone(initial = phone) {
    setViewport(600)
    const onChange = vi.fn()
    render(
      <TooltipProvider>
        <Harness initial={initial} onChange={onChange} />
      </TooltipProvider>,
    )
    return onChange
  }

  const last = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.calls.at(-1)?.[0] as DraftSection
  const openRow = async (name: RegExp) => {
    fireEvent.click(screen.getByRole('button', { name }))
    return screen.findByRole('dialog', { name: 'Zutat bearbeiten' })
  }

  it('shows each ingredient as one reading row without fields', () => {
    setupPhone()

    const row = screen.getByRole('button', { name: 'ca. 800 g Zwiebel gehackt' })
    expect(within(row).getByText('ca. 800 g')).toBeTruthy()
    expect(within(row).getByText('gehackt')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Menge' })).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Zutat \d+: Aktionen/ })).toBeNull()
    expect(screen.queryByText('Einheit')).toBeNull()
  })

  it('opens the sheet with the four fields on a tap', async () => {
    setupPhone()

    const sheet = await openRow(/Zwiebel/)
    expect((within(sheet).getByRole('textbox', { name: 'Menge' }) as HTMLInputElement).value).toBe('ca. 800')
    expect((within(sheet).getByRole('combobox', { name: 'Einheit' }) as HTMLInputElement).value).toBe('g')
    expect((within(sheet).getByRole('combobox', { name: 'Zutat' }) as HTMLInputElement).value).toBe('Zwiebel')
    expect((within(sheet).getByRole('textbox', { name: 'Zusatz' }) as HTMLInputElement).value).toBe('gehackt')
    expect(within(sheet).getByRole('button', { name: 'g', pressed: true })).toBeTruthy()
  })

  it('puts a change straight into the draft and the row', async () => {
    const onChange = setupPhone()

    const sheet = await openRow(/Zwiebel/)
    fireEvent.change(within(sheet).getByRole('textbox', { name: 'Menge' }), { target: { value: '1 kg' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'kg' }))

    expect(last(onChange).ingredients[0]).toEqual({ key: 30, ingredient: 1, text: 'gehackt', amount: '1 kg', unit: 'kg' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Fertig' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: '1 kg kg Zwiebel gehackt' })).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /Zwiebel/ })))
  })

  it('moves the row up and down from the sheet and stays on it', async () => {
    const onChange = setupPhone()

    const sheet = await openRow(/Salz/)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Nach oben' }))
    expect(last(onChange).ingredients.map((l) => l.key)).toEqual([31, 30, 32])
    expect(within(sheet).getByRole('button', { name: 'Nach oben' })).toHaveProperty('disabled', true)

    fireEvent.click(within(sheet).getByRole('button', { name: 'Nach unten' }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Nach unten' }))
    expect(last(onChange).ingredients.map((l) => l.key)).toEqual([30, 32, 31])
    expect(within(sheet).getByRole('button', { name: 'Nach unten' })).toHaveProperty('disabled', true)
    expect((within(sheet).getByRole('combobox', { name: 'Zutat' }) as HTMLInputElement).value).toBe('Salz')
  })

  it('removes the row from the sheet', async () => {
    const onChange = setupPhone()

    const sheet = await openRow(/Salz/)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Entfernen' }))

    expect(last(onChange).ingredients.map((l) => l.key)).toEqual([30, 32])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByRole('button', { name: /Salz/ })).toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Zutat hinzufügen' })),
    )
  })

  it('opens the sheet for a new row on „Zutat hinzufügen“ and drops it when closed blank', async () => {
    const onChange = setupPhone()

    fireEvent.click(screen.getByRole('button', { name: 'Zutat hinzufügen' }))
    const sheet = await screen.findByRole('dialog', { name: 'Zutat bearbeiten' })
    expect(last(onChange).ingredients).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Neue Zutat', hidden: true })).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(within(sheet).getByRole('textbox', { name: 'Menge' })))

    fireEvent.click(within(sheet).getByRole('button', { name: 'Fertig' }))
    await waitFor(() => expect(last(onChange).ingredients).toHaveLength(3))
    expect(screen.queryByRole('button', { name: 'Neue Zutat' })).toBeNull()
  })

  it('keeps a new row with only an amount', async () => {
    const onChange = setupPhone()

    fireEvent.click(screen.getByRole('button', { name: 'Zutat hinzufügen' }))
    const sheet = await screen.findByRole('dialog', { name: 'Zutat bearbeiten' })
    fireEvent.change(within(sheet).getByRole('textbox', { name: 'Menge' }), { target: { value: '2' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Fertig' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(last(onChange).ingredients).toHaveLength(4)
    expect(last(onChange).ingredients[3]).toMatchObject({ amount: '2', ingredient: null, text: '' })
  })

  it('drops the blank row a new section starts with when its sheet closes', async () => {
    const onChange = setupPhone({ ...phone, ingredients: [{ key: 40, ingredient: null, text: '', amount: '', unit: '' }] })

    const sheet = await openRow(/Neue Zutat/)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Fertig' }))

    await waitFor(() => expect(last(onChange).ingredients).toEqual([]))
  })

  it('commits a typed name when the sheet closes', async () => {
    const onChange = setupPhone()

    fireEvent.click(screen.getByRole('button', { name: 'Zutat hinzufügen' }))
    const sheet = await screen.findByRole('dialog', { name: 'Zutat bearbeiten' })
    const name = within(sheet).getByRole('combobox', { name: 'Zutat' })
    name.focus()
    fireEvent.change(name, { target: { value: 'Pfeffer' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Fertig' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(last(onChange).ingredients[3]).toMatchObject({ ingredient: null, text: 'Pfeffer' })
    expect(screen.getByRole('button', { name: 'Pfeffer' })).toBeTruthy()
  })

  it('keeps the sheet open on Escape in an open suggestion list, then drops typed text on Escape', async () => {
    setupPhone()

    const sheet = await openRow(/Salz/)
    const name = within(sheet).getByRole('combobox', { name: 'Zutat' })
    name.focus()
    fireEvent.change(name, { target: { value: 'Zwie' } })
    expect(name.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(name, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()

    fireEvent.keyDown(name, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'Salz' })).toBeTruthy()
  })

  it('drops the sheet when the window widens and does not bring it back', async () => {
    setupPhone()

    await openRow(/Salz/)
    setViewport(1024)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getAllByRole('textbox', { name: 'Menge' })).toHaveLength(3)

    setViewport(600)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: /Salz/ })).toBeTruthy()
  })

  it('keeps the table with fields on the desktop', () => {
    setViewport(1024)
    render(
      <TooltipProvider>
        <Harness initial={phone} onChange={vi.fn()} />
      </TooltipProvider>,
    )

    expect(screen.getAllByRole('textbox', { name: 'Menge' })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Zwiebel/ })).toBeNull()
  })
})
