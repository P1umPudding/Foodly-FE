import { render, screen, fireEvent } from '@testing-library/react'
import { CategorySidebar } from './CategorySidebar'
import type { UserCategory } from '../../api/protocol'

const cats: UserCategory[] = [
  {
    id: 1,
    user: 1,
    name: 'Favoriten',
    recipes: [1, 2, 3],
    order: 0,
    color: '#e11d48',
    colorLight: null,
    colorDark: null,
  },
  { id: 2, user: 1, name: 'Schnell', recipes: [4], order: 1, color: '#0ea5e9', colorLight: null, colorDark: null },
]

it('renders categories with static counts and toggles', () => {
  const onToggle = vi.fn()
  render(<CategorySidebar categories={cats} selected={[1]} onToggle={onToggle} />)
  expect(screen.getByText('Favoriten')).toBeTruthy()
  expect(screen.getByText('3')).toBeTruthy() // static count
  fireEvent.click(screen.getByText('Schnell'))
  expect(onToggle).toHaveBeenCalledWith(2)
})
