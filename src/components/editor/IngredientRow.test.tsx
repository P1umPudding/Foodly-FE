import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { IngredientRow } from './IngredientRow'
import { newIngredient } from '../../editor/draft'
import type { DraftIngredient } from '../../editor/draft'

vi.mock('../../catalog/CatalogProvider', () => ({
  useIngredients: () => ({
    byId: { 1: { id: 1, name: 'Zwiebel' }, 2: { id: 2, name: 'Schalotte' } },
    status: 'ready',
  }),
}))

// Holds the line in state like SectionEditor does, so the row re-renders with each patch.
function setup(initial: DraftIngredient) {
  let current = initial
  function Harness() {
    const [line, setLine] = useState(initial)
    return (
      <IngredientRow
        line={line}
        onChange={(patch) => {
          current = { ...current, ...patch }
          setLine(current)
        }}
        onUp={vi.fn()}
        onDown={vi.fn()}
        onRemove={vi.fn()}
        canMoveUp={false}
        canMoveDown={false}
      />
    )
  }
  render(
    <TooltipProvider>
      <Harness />
    </TooltipProvider>,
  )
  return { line: () => current }
}

const zusatz = () => screen.getByLabelText('Zusatz') as HTMLInputElement

async function pick(name: string) {
  fireEvent.click(screen.getByRole('combobox'))
  fireEvent.change(screen.getByPlaceholderText('Zutat suchen …'), { target: { value: name } })
  fireEvent.click(await screen.findByText(name))
}

const catalogLine = (over: Partial<DraftIngredient> = {}): DraftIngredient => ({
  key: 1,
  ingredient: 1,
  text: '',
  amount: '',
  amountPrefix: '',
  unit: '',
  ...over,
})

describe('IngredientRow · Zusatz', () => {
  it('edits the Zusatz once a catalog ingredient is picked', async () => {
    const { line } = setup(newIngredient())
    expect(zusatz().disabled).toBe(true)

    await pick('Zwiebel')
    expect(zusatz().disabled).toBe(false)

    fireEvent.change(zusatz(), { target: { value: 'nach Geschmack' } })

    expect(zusatz().value).toBe('nach Geschmack')
    expect(line()).toMatchObject({ ingredient: 1, text: 'nach Geschmack' })
  })

  it('keeps the Zusatz when swapping one catalog ingredient for another', async () => {
    const { line } = setup(catalogLine({ text: 'gehackt' }))

    await pick('Schalotte')

    expect(line()).toMatchObject({ ingredient: 2, text: 'gehackt' })
    expect(zusatz().value).toBe('gehackt')
  })

  it('has no active Zusatz on a free-text row, whose name lives in text', () => {
    const { line } = setup(catalogLine({ ingredient: null, text: 'Salz' }))

    expect(zusatz().disabled).toBe(true)
    expect(zusatz().value).toBe('')
    expect(screen.getByRole('combobox').textContent).toContain('Salz')
    expect(line().text).toBe('Salz')
  })

  it('does not turn the free-text name into a Zusatz when a catalog ingredient is picked', async () => {
    const { line } = setup(catalogLine({ ingredient: null, text: 'Salz' }))

    await pick('Zwiebel')

    expect(line()).toMatchObject({ ingredient: 1, text: '' })
    expect(zusatz().value).toBe('')
  })

  it('replaces a catalog ingredient and its Zusatz with free text without mixing them', async () => {
    const { line } = setup(catalogLine({ text: 'gehackt' }))

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByPlaceholderText('Zutat suchen …'), { target: { value: 'Zimtstange' } })
    fireEvent.click(await screen.findByText('„Zimtstange" als Freitext übernehmen'))

    expect(line()).toMatchObject({ ingredient: null, text: 'Zimtstange' })
    expect(zusatz().disabled).toBe(true)
  })
})
