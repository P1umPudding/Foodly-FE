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

const classes = (el: HTMLElement) => el.className.split(/\s+/)

function setup(state: ListState) {
  return renderControls(state)
}

// Note: postxl ToggleGroupItem renders as role="radio" (inside a RadioGroup),
// not role="button" — adapt getByRole accordingly.
describe('Zugriff grey-out + relax', () => {
  it('greys impossible Freigabe options once a role is chosen', () => {
    setup({ ...DEFAULT_STATE, role: 'editor' })
    // editor → only Collaborative is valid; Privat + Geteilt greyed
    expect(classes(screen.getByRole('radio', { name: /Privat/i }))).toContain('*:opacity-40')
    expect(classes(screen.getByRole('radio', { name: /Geteilt/i }))).toContain('*:opacity-40')
    expect(classes(screen.getByRole('radio', { name: /Kollaborativ/i }))).not.toContain('*:opacity-40')
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

describe('toggle focus ring (#95)', () => {
  it('gives every toggle item the 3-px ring instead of postxl ring-1', () => {
    setup(DEFAULT_STATE)
    const items = screen.getAllByRole('radio')
    // 3 work-time presets + 3 roles + 3 sharing options
    expect(items).toHaveLength(9)
    for (const item of items) {
      expect(classes(item)).toContain('focus-visible:ring-[3px]')
      expect(classes(item)).not.toContain('focus-visible:ring-1')
    }
  })

  it('keeps a selected chip inset only at rest, so the focus ring is drawn outside', () => {
    setup({ ...DEFAULT_STATE, role: 'owner' })
    const owner = classes(screen.getByRole('radio', { name: /Besitzer/i }))
    expect(owner).toContain('not-focus-visible:ring-inset')
    expect(owner).not.toContain('ring-inset')
  })

  it('fades a greyed item through its content, not the item itself', () => {
    setup({ ...DEFAULT_STATE, role: 'editor' })
    const privat = classes(screen.getByRole('radio', { name: /Privat/i }))
    expect(privat).toContain('*:opacity-40')
    expect(privat).toContain('hover:bg-muted/40')
    expect(privat).not.toContain('opacity-40')
    expect(privat).not.toContain('hover:bg-muted')
  })
})
