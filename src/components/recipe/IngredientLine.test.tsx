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
    expect(screen.getByText('nicht skaliert').textContent).toBe('Menge nicht skaliert')
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

  it.each([null, '  '])('shows no hint for a missing or blank amount (%j)', (amount) => {
    renderLine(amount, 2)
    expect(screen.queryByText('nicht skaliert')).toBeNull()
  })
})

describe('IngredientLine — extra text', () => {
  function renderWith(over: Partial<RecipeIngredient>) {
    const line = { id: 1, ingredient: null, text: null, amount: null, amountPrefix: null, unit: null, ...over }
    render(
      <table>
        <tbody>
          <IngredientLine line={line as RecipeIngredient} />
        </tbody>
      </table>,
    )
  }

  it('mutes the extra text after a linked ingredient, not the name', () => {
    renderWith({ ingredient: { id: 5, name: 'Salz' }, text: 'nach Geschmack' })
    const extra = screen.getByText('nach Geschmack')
    expect(extra.className).toContain('text-muted-foreground')
    const cell = extra.closest('td')!
    expect(cell.textContent).toBe('Salz nach Geschmack')
    expect(cell.className).not.toContain('text-muted-foreground')
  })

  it.each([null, '', '  '])('shows only the name for a linked ingredient without extra text (%j)', (text) => {
    renderWith({ ingredient: { id: 5, name: 'Salz' }, text })
    expect(screen.getByText('Salz').querySelector('.text-muted-foreground')).toBeNull()
  })

  it('keeps free text in the normal colour', () => {
    renderWith({ text: 'Saft einer halben Zitrone' })
    expect(screen.getByText('Saft einer halben Zitrone').closest('.text-muted-foreground')).toBeNull()
  })
})
