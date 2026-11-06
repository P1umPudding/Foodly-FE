import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { checkboxLabels } from '../../../test/checkboxes'
import { IngredientFilter } from './IngredientFilter'
import type { Ingredient } from '../../../api/protocol'

// 30 ingredients, deliberately not in name order: the component sorts itself.
const ingredients: Ingredient[] = Array.from({ length: 30 }, (_, i) => {
  const n = 30 - i
  return { id: n, name: `Zutat ${String(n).padStart(2, '0')}` }
})

const first12 = Array.from({ length: 12 }, (_, i) => `Zutat ${String(i + 1).padStart(2, '0')}`)

describe('IngredientFilter', () => {
  it('shows only the first 12 by name plus the search hint', () => {
    render(<IngredientFilter ingredients={ingredients} selected={[]} set={() => {}} />)
    expect(checkboxLabels()).toEqual(first12)
    expect(screen.getByText('Weitere über die Suche')).toBeTruthy()
  })

  it('keeps selected ingredients on top, in addition to the first 12', () => {
    render(<IngredientFilter ingredients={ingredients} selected={[20]} set={() => {}} />)
    expect(checkboxLabels()).toEqual(['Zutat 20', ...first12])
    expect(screen.getByRole('checkbox', { name: 'Zutat 20' })).toHaveProperty('checked', true)
  })

  it('finds the rest through the search', () => {
    render(<IngredientFilter ingredients={ingredients} selected={[]} set={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Zutat suchen…'), { target: { value: '25' } })
    expect(checkboxLabels()).toEqual(['Zutat 25'])
    expect(screen.queryByText('Weitere über die Suche')).toBeNull()
  })

  it('toggles an ingredient', () => {
    const set = vi.fn()
    render(<IngredientFilter ingredients={ingredients} selected={[3]} set={set} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Zutat 05' }))
    expect(set).toHaveBeenCalledWith({ ingredients: [3, 5] })
  })

  it('hides the hint when everything fits', () => {
    render(<IngredientFilter ingredients={ingredients.slice(0, 5)} selected={[]} set={() => {}} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.queryByText('Weitere über die Suche')).toBeNull()
  })
})
