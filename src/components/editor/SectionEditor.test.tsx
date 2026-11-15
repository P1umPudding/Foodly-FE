import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { SectionEditor } from './SectionEditor'
import type { DraftSection } from '../../editor/draft'

vi.mock('../../catalog/CatalogProvider', () => ({
  useIngredients: () => ({ byId: { 1: { id: 1, name: 'Zwiebel' } }, status: 'ready' }),
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
    setup()
    expect(screen.queryByText(/werden im Rezept zu Timern/)).toBeNull()
  })

  it('names an unnamed section "Abschnitt ohne Namen"', () => {
    setup(vi.fn(), { ...section, name: '' })
    expect(screen.getByPlaceholderText('Abschnitt ohne Namen')).toBeTruthy()
  })

  it('edits the section name', () => {
    const onChange = setup()

    fireEvent.change(screen.getByLabelText('Abschnittsname'), { target: { value: 'Teig' } })

    expect(onChange.mock.calls[0][0].name).toBe('Teig')
  })
})
