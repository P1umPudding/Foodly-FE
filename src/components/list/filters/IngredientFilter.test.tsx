import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { checkboxLabels } from '../../../test/checkboxes'
import { IngredientFilter } from './IngredientFilter'
import type { Ingredient } from '../../../api/protocol'

// 30 ingredients in the order the list hands them over (most used first); the component keeps it.
const ingredients: Ingredient[] = Array.from({ length: 30 }, (_, i) => {
  const n = 30 - i
  return { id: n, name: `Zutat ${String(n).padStart(2, '0')}` }
})
const label = (n: number) => `Zutat ${String(n).padStart(2, '0')}`
const first9 = Array.from({ length: 9 }, (_, i) => label(30 - i))
const HINT = 'Alle weiteren über die Suche. Mehrere = Rezept enthält alle.'

describe('IngredientFilter', () => {
  it('shows the first 9 in the given order and the mockup hint', () => {
    render(<IngredientFilter ingredients={ingredients} selected={[]} set={() => {}} />)
    expect(checkboxLabels()).toEqual(first9)
    expect(screen.getByText(HINT)).toBeTruthy()
  })

  it('puts selected ingredients on top; they count toward the 9', () => {
    render(<IngredientFilter ingredients={ingredients} selected={[20, 3]} set={() => {}} />)
    expect(checkboxLabels()).toEqual([label(20), label(3), ...first9.slice(0, 7)])
    expect(screen.getByRole('checkbox', { name: 'Zutat 20' })).toHaveProperty('checked', true)
  })

  it('never cuts off a selection', () => {
    const many = Array.from({ length: 11 }, (_, i) => 30 - i)
    render(<IngredientFilter ingredients={ingredients} selected={many} set={() => {}} />)
    expect(checkboxLabels()).toHaveLength(11)
  })

  it('finds the rest through the search', () => {
    render(<IngredientFilter ingredients={ingredients} selected={[]} set={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Zutat suchen'), { target: { value: '0' } })
    expect(checkboxLabels()).toHaveLength(12)
    expect(screen.getByText(HINT)).toBeTruthy()
  })

  it('toggles an ingredient', () => {
    const set = vi.fn()
    render(<IngredientFilter ingredients={ingredients} selected={[3]} set={set} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Zutat 28' }))
    expect(set).toHaveBeenCalledWith({ ingredients: [3, 28] })
  })

  it('keeps the order from when it opened while the frequencies change', () => {
    const { rerender } = render(<IngredientFilter ingredients={ingredients} selected={[]} set={() => {}} />)
    rerender(<IngredientFilter ingredients={[...ingredients].reverse()} selected={[]} set={() => {}} />)
    expect(checkboxLabels()).toEqual(first9)
  })
})
