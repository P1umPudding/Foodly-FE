import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FilterControls } from './FilterControls'
import { DEFAULT_STATE, type ListState } from '../../list/state'

const baseProps = {
  categories: [],
  onToggleCategory: () => {},
  tags: [],
  ingredients: [],
}

it('role and sharing filter labels are rendered', () => {
  const set = vi.fn()
  render(<FilterControls state={DEFAULT_STATE} set={set} {...baseProps} />)
  expect(screen.getByText('Rolle')).toBeTruthy()
  expect(screen.getByText('Freigabe')).toBeTruthy()
})

function setup(state: ListState) {
  const set = vi.fn()
  render(<FilterControls state={state} set={set} {...baseProps} />)
  return { set }
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
