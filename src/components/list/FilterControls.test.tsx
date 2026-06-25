import { render, screen } from '@testing-library/react'
import { FilterControls } from './FilterControls'
import { DEFAULT_STATE } from '../../list/state'

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
