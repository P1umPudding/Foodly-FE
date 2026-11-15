import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IngredientPicker } from './IngredientPicker'

vi.mock('../../catalog/CatalogProvider', () => ({
  useIngredients: () => ({
    byId: { 1: { id: 1, name: 'Zwiebel' }, 2: { id: 2, name: 'Zucchini' } },
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
  it('shows the picked catalog ingredient by name, free text as typed', () => {
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
    fireEvent.click(screen.getByRole('option', { name: '„Zimtstange" als Freitext übernehmen' }))

    expect(onText).toHaveBeenCalledWith('Zimtstange')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('reverts with Escape and commits nothing', () => {
    const { onText } = setup(1)

    type('Zw')
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
})
