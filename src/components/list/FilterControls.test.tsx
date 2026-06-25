import { render, screen, fireEvent } from '@testing-library/react';
import { FilterControls } from './FilterControls';
import { DEFAULT_STATE } from '../../list/state';

it('search input pushes a q patch', () => {
  const set = vi.fn();
  render(<FilterControls state={DEFAULT_STATE} set={set} tags={[]} ingredients={[]} />);
  fireEvent.change(screen.getByPlaceholderText(/suchen/i), { target: { value: 'apfel' } });
  expect(set).toHaveBeenCalledWith({ search: 'apfel' });
});

it('role and sharing filter labels are rendered', () => {
  const set = vi.fn();
  render(<FilterControls state={DEFAULT_STATE} set={set} tags={[]} ingredients={[]} />);
  expect(screen.getByText('Rolle')).toBeTruthy();
  expect(screen.getByText('Freigabe')).toBeTruthy();
});
