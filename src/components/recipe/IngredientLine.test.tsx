import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IngredientLine } from './IngredientLine'
import type { RecipeIngredient } from '../../api/protocol'

// Tag rendering depends on the tag catalog; render the text verbatim instead.
vi.mock('../TagText', () => ({ TagText: ({ value }: { value: string }) => value }))

function renderLine(amount: string | null, factor: number) {
  const line = { id: 1, ingredient: null, text: 'Salz', amount, amountPrefix: null, unit: null } as RecipeIngredient
  render(
    <table>
      <tbody>
        <IngredientLine line={line} factor={factor} />
      </tbody>
    </table>,
  )
}

describe('IngredientLine — "nicht skaliert" hint', () => {
  it('flags an amount it cannot scale when the factor is not 1', () => {
    renderLine('etwas', 2)
    expect(screen.getByText('etwas')).toBeTruthy()
    expect(screen.getByText('nicht skaliert')).toBeTruthy()
  })

  it('shows no hint at factor 1', () => {
    renderLine('etwas', 1)
    expect(screen.queryByText('nicht skaliert')).toBeNull()
  })

  it('scales a fraction without a hint', () => {
    renderLine('½', 2)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.queryByText('nicht skaliert')).toBeNull()
  })

  it('shows no hint for a missing or blank amount', () => {
    renderLine(null, 2)
    renderLine('  ', 2)
    expect(screen.queryByText('nicht skaliert')).toBeNull()
  })
})
