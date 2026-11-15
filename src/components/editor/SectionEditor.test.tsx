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
    fireEvent.click(screen.getByRole('button', { name: 'Mehrere Zutaten einfügen' }))
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
    expect(rows.slice(0, 2).map((r: { key: number }) => r.key)).toEqual([10, 11])
    expect(withoutKeys(rows.slice(2))).toEqual(added)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mehrere Zutaten einfügen' }))
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
  })
})
