import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IngredientPicker } from './IngredientPicker'

vi.mock('../../catalog/CatalogProvider', () => ({
  useIngredients: () => ({
    byId: { 1: { id: 1, name: 'Zwiebel' }, 2: { id: 2, name: 'Zucchini' } },
    status: 'ready',
  }),
}))

describe('IngredientPicker', () => {
  it('shows the picked catalog ingredient by name', () => {
    render(<IngredientPicker value={1} text="" onPick={vi.fn()} onText={vi.fn()} />)

    expect(screen.getByRole('combobox').textContent).toContain('Zwiebel')
  })

  it('picks a catalog ingredient', async () => {
    const onPick = vi.fn()
    render(<IngredientPicker value={null} text="" onPick={onPick} onText={vi.fn()} />)

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByPlaceholderText('Zutat suchen …'), { target: { value: 'Zucc' } })
    fireEvent.click(await screen.findByText('Zucchini'))

    expect(onPick).toHaveBeenCalledWith(2)
  })

  it('offers the typed value as free text when nothing matches', async () => {
    const onText = vi.fn()
    render(<IngredientPicker value={null} text="" onPick={vi.fn()} onText={onText} />)

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByPlaceholderText('Zutat suchen …'), { target: { value: 'Zimtstange' } })
    fireEvent.click(await screen.findByText('„Zimtstange" als Freitext übernehmen'))

    expect(onText).toHaveBeenCalledWith('Zimtstange')
  })

  it('shows existing free text', () => {
    render(<IngredientPicker value={null} text="Salz" onPick={vi.fn()} onText={vi.fn()} />)

    expect(screen.getByRole('combobox').textContent).toContain('Salz')
  })
})
