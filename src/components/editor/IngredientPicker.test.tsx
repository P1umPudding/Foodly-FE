import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IngredientPicker } from './IngredientPicker'

vi.mock('../../catalog/CatalogProvider', () => ({
  useIngredients: () => ({
    byId: {
      1: { id: 1, name: 'Zwiebel' },
      2: { id: 2, name: 'Zucchini' },
      3: { id: 3, name: 'Tomaten (gehackt)' },
      20: { id: 20, name: 'Tomaten' },
    },
    status: 'ready',
  }),
}))

const field = () => screen.getByRole('combobox', { name: 'Zutat' }) as HTMLInputElement
const type = (value: string) => fireEvent.change(field(), { target: { value } })

function setup(value: number | null = null, text = '') {
  const onPick = vi.fn()
  const onText = vi.fn()
  render(<IngredientPicker value={value} text={text} onPick={onPick} onText={onText} />)
  return { onPick, onText }
}

describe('IngredientPicker', () => {
  it('shows the picked catalog ingredient by name', () => {
    setup(1)
    expect(field().value).toBe('Zwiebel')
  })

  it('shows existing free text', () => {
    setup(null, 'Salz')
    expect(field().value).toBe('Salz')
  })

  it('lists matches right below the field while typing and picks one by click', () => {
    const { onPick, onText } = setup()

    type('Zucc')
    fireEvent.click(screen.getByRole('option', { name: 'Zucchini' }))

    expect(onPick).toHaveBeenCalledWith(2)
    expect(onText).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('picks the active match with Enter', () => {
    const { onPick } = setup()

    type('zwi')
    fireEvent.keyDown(field(), { key: 'Enter' })

    expect(onPick).toHaveBeenCalledWith(1)
  })

  it('does not open the list on focus alone', () => {
    setup()
    fireEvent.focus(field())
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('changes nothing while typing; leaving the field commits the text as free text', () => {
    const { onPick, onText } = setup(1)

    type('Zimtstange')
    expect(onText).not.toHaveBeenCalled()

    fireEvent.blur(field())
    expect(onText).toHaveBeenCalledWith('Zimtstange')
    expect(onPick).not.toHaveBeenCalled()
  })

  it('offers the typed value as free text when it is no catalog name', () => {
    const { onText } = setup()

    type('Zimtstange')
    fireEvent.click(screen.getByRole('option', { name: '„Zimtstange“ als Freitext übernehmen' }))

    expect(onText).toHaveBeenCalledWith('Zimtstange')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('closes the list with the first Escape and reverts with the second', () => {
    const { onText } = setup(1)

    type('Zw')
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(field().value).toBe('Zw')
    fireEvent.keyDown(field(), { key: 'Escape' })
    fireEvent.blur(field())

    expect(field().value).toBe('Zwiebel')
    expect(onText).not.toHaveBeenCalled()
  })

  it('commits nothing when the field is left unchanged', () => {
    const { onText } = setup(1)

    type('Zwiebe')
    type('Zwiebel')
    fireEvent.blur(field())

    expect(onText).not.toHaveBeenCalled()
  })

  it('lists nothing for an empty field, so Enter links no catalog entry', () => {
    const { onPick, onText } = setup(null, 'Salz')

    type('')
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.keyDown(field(), { key: 'Enter' })
    fireEvent.blur(field())

    expect(onPick).not.toHaveBeenCalled()
    expect(onText).not.toHaveBeenCalled()
    expect(field().value).toBe('Salz')
  })

  it('keeps the catalog link when only the case differs', () => {
    const { onText } = setup(1)

    type('zwiebel')
    fireEvent.blur(field())

    expect(onText).not.toHaveBeenCalled()
  })

  it('takes the active catalog hit on Enter but keeps the typed text as free text on blur', () => {
    const { onPick, onText } = setup()

    type('Zuc')
    fireEvent.blur(field())
    expect(onText).toHaveBeenCalledWith('Zuc')
    expect(onPick).not.toHaveBeenCalled()

    type('Zuc')
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onPick).toHaveBeenCalledWith(2)
  })

  it('takes a capitalisation fix on a free-text row', () => {
    const { onText } = setup(null, 'salz')

    type('Salz')
    fireEvent.blur(field())

    expect(onText).toHaveBeenCalledWith('Salz')
  })

  it('links the catalog entry whose full name was typed when the field is left', () => {
    const { onPick, onText } = setup(1)

    type('zucchini')
    fireEvent.blur(field())

    expect(onPick).toHaveBeenCalledWith(2)
    expect(onText).not.toHaveBeenCalled()
  })

  it('keeps the list open while its scrollbar is used', () => {
    setup()

    type('Z')
    const list = screen.getByRole('listbox')
    expect(fireEvent.mouseDown(list)).toBe(false)
  })

  it('lists the exact name first, so Enter links the same entry as leaving the field', () => {
    const { onPick } = setup()

    type('tomaten')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Tomaten', 'Tomaten (gehackt)'])
    fireEvent.keyDown(field(), { key: 'Enter' })

    expect(onPick).toHaveBeenCalledWith(20)
  })

  it('confirms the typed text with Enter after Escape closed the list', () => {
    const { onText } = setup()

    type('Zimtstange')
    fireEvent.keyDown(field(), { key: 'Escape' })
    fireEvent.keyDown(field(), { key: 'Enter' })

    expect(onText).toHaveBeenCalledWith('Zimtstange')
  })
})

describe('IngredientPicker forwards keepListInView', () => {
  afterEach(() => vi.restoreAllMocks())

  it('scrolls the list into view with it, as the phone sheet sets it (#306)', () => {
    // Region 0–200, field 160–200, list below it: anything to scroll means the opt-in reached SuggestInput.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const top = this.getAttribute('role') === 'listbox' ? 204 : this.getAttribute('role') === 'combobox' ? 160 : 0
      return { top, bottom: top + (top === 0 ? 200 : 40) } as DOMRect
    })
    const { getByTestId } = render(
      <div data-testid="region" style={{ overflowY: 'auto' }}>
        <IngredientPicker value={null} text="" onPick={vi.fn()} onText={vi.fn()} keepListInView />
      </div>,
    )
    type('Lin')
    expect(getByTestId('region').scrollTop).toBeGreaterThan(0)
  })
})
