import { render, screen, fireEvent } from '@testing-library/react'
import { FilterControls } from './FilterControls'
import { DEFAULT_STATE } from '../../list/state'

const baseProps = {
  categories: [],
  onToggleCategory: () => {},
  tags: [],
  ingredients: [],
  active: false,
  onClear: () => {},
}

it('search input pushes a q patch', () => {
  const set = vi.fn()
  render(<FilterControls state={DEFAULT_STATE} set={set} {...baseProps} />)
  fireEvent.change(screen.getByPlaceholderText(/rezepte suchen/i), { target: { value: 'apfel' } })
  expect(set).toHaveBeenCalledWith({ search: 'apfel' })
})

it('role and sharing filter labels are rendered', () => {
  const set = vi.fn()
  render(<FilterControls state={DEFAULT_STATE} set={set} {...baseProps} />)
  expect(screen.getByText('Rolle')).toBeTruthy()
  expect(screen.getByText('Freigabe')).toBeTruthy()
})
