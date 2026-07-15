import { fireEvent, render, screen } from '@testing-library/react'
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
  ingredients: [{ key: 10, ingredient: 1, text: '', amount: '1', amountPrefix: '', unit: '' }],
  steps: [
    { key: 20, text: 'Hacken.' },
    { key: 21, text: 'Braten.' },
  ],
}

function setup(onChange = vi.fn()) {
  render(
    <TooltipProvider>
      <SectionEditor
        section={section}
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
  it('adds an ingredient row', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: /zutat hinzufügen/i }))

    expect(onChange.mock.calls[0][0].ingredients).toHaveLength(2)
  })

  it('adds a step', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: /schritt hinzufügen/i }))

    expect(onChange.mock.calls[0][0].steps).toHaveLength(3)
  })

  it('moves a step down', () => {
    const onChange = setup()

    // The first step's "Nach unten" — DOM order is section, then the single
    // ingredient row, then steps, so it's the third "Nach unten" button (index 2).
    const downs = screen.getAllByRole('button', { name: 'Nach unten' })
    fireEvent.click(downs[2])

    expect(onChange.mock.calls[0][0].steps.map((s: { text: string }) => s.text)).toEqual(['Braten.', 'Hacken.'])
  })

  it('removes a step', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Schritt 2 entfernen' }))

    expect(onChange.mock.calls[0][0].steps.map((s: { text: string }) => s.text)).toEqual(['Hacken.'])
  })

  it('edits the section name', () => {
    const onChange = setup()

    fireEvent.change(screen.getByLabelText('Abschnittsname'), { target: { value: 'Teig' } })

    expect(onChange.mock.calls[0][0].name).toBe('Teig')
  })
})
