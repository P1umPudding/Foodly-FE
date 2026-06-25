import { render, screen, fireEvent } from '@testing-library/react';
import { FilterControls } from './FilterControls';
import { DEFAULT_STATE } from '../../list/state';
import { roleCellKey } from '../../list/counts';

const noop = () => {};
const counts = { [roleCellKey('owner', 'private')]: 2, [roleCellKey('viewer', 'shared')]: 1 };

it('search input pushes a q patch', () => {
  const set = vi.fn();
  render(<FilterControls state={DEFAULT_STATE} set={set} tags={[]} ingredients={[]} gridCounts={counts} />);
  fireEvent.change(screen.getByPlaceholderText(/suchen/i), { target: { value: 'apfel' } });
  expect(set).toHaveBeenCalledWith({ search: 'apfel' });
});

it('relax behaviour: clicking an invalid role cell resets the sister axis to any', () => {
  const set = vi.fn();
  render(<FilterControls state={{ ...DEFAULT_STATE, role: 'editor' }} set={set} tags={[]} ingredients={[]} gridCounts={counts} />);
  // editor × private is logically impossible → clicking it relaxes role to 'any'
  fireEvent.click(screen.getByRole('button', { name: /Bearbeiter.*privat|privat.*Bearbeiter/i }));
  expect(set).toHaveBeenCalledWith({ role: 'any', collab: 'private' });
});
