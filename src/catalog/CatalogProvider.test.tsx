import { render, screen, waitFor } from '@testing-library/react';
import { CatalogProvider, useIngredient } from './CatalogProvider';

vi.mock('../api', () => ({
  foodly: {
    listTags: () => Promise.resolve([]),
    listUsers: () => Promise.resolve([]),
    me: () => Promise.resolve({ id: 1, name: 'Kolja', profilePicture: null }),
    listIngredients: () => Promise.resolve([{ id: 5, name: 'Zwiebel' }]),
  },
}));

function Probe() {
  return <span>ing:{useIngredient(5)?.name ?? '-'}</span>;
}

it('loads ingredients into the catalog', async () => {
  render(<CatalogProvider><Probe /></CatalogProvider>);
  await waitFor(() => screen.getByText('ing:Zwiebel'));
});
