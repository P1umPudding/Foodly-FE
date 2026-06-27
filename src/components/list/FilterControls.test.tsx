import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TooltipProvider } from '@postxl/ui-components'
import { FilterControls } from './FilterControls'
import { DEFAULT_STATE, type ListState } from '../../list/state'

const baseProps = {
  categories: [],
  onToggleCategory: () => {},
  tags: [],
  ingredients: [],
}

function renderControls(state: ListState, set = vi.fn()) {
  render(
    <TooltipProvider>
      <FilterControls state={state} set={set} {...baseProps} />
    </TooltipProvider>,
  )
  return { set }
}

it('role and sharing filter labels are rendered', () => {
  renderControls(DEFAULT_STATE)
  expect(screen.getByText('Rolle')).toBeTruthy()
  expect(screen.getByText('Freigabe')).toBeTruthy()
})

function setup(state: ListState) {
  return renderControls(state)
}

// Note: postxl ToggleGroupItem renders as role="radio" (inside a RadioGroup),
// not role="button" — adapt getByRole accordingly.
describe('Zugriff grey-out + relax', () => {
  it('greys impossible Freigabe options once a role is chosen', () => {
    setup({ ...DEFAULT_STATE, role: 'editor' })
    // editor → only Collaborative is valid; Privat + Geteilt greyed
    expect(screen.getByRole('radio', { name: /Privat/i }).className).toContain('opacity-40')
    expect(screen.getByRole('radio', { name: /Geteilt/i }).className).toContain('opacity-40')
    expect(screen.getByRole('radio', { name: /Kollaborativ/i }).className).not.toContain('opacity-40')
  })

  it('relaxes the sister axis when an impossible option is clicked', () => {
    const { set } = setup({ ...DEFAULT_STATE, role: 'editor' })
    fireEvent.click(screen.getByRole('radio', { name: /Privat/i }))
    expect(set).toHaveBeenCalledWith({ collab: 'private', role: 'any' })
  })
})

// The Tooltip wrapping each ToggleGroupItem hijacks Radix's data-state, so the
// selected styling is driven by a JS flag instead — guard that it actually lands
// on the chosen segment (and only that one).
describe('Zugriff selected indication', () => {
  it('applies the neutral selected styling to the chosen role, not the others', () => {
    setup({ ...DEFAULT_STATE, role: 'owner' })
    expect(screen.getByRole('radio', { name: /Besitzer/i }).className).toContain('ring-foreground/30')
    expect(screen.getByRole('radio', { name: /Bearbeiter/i }).className).not.toContain('ring-foreground/30')
  })

  it('applies the selected styling to the chosen Freigabe', () => {
    setup({ ...DEFAULT_STATE, collab: 'collaborative' })
    expect(screen.getByRole('radio', { name: /Kollaborativ/i }).className).toContain('bg-foreground/15')
  })
})
