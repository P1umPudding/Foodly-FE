import { render, screen, waitFor } from '@testing-library/react'
import { CatalogProvider, useCategories, useIngredient, useMe } from './CatalogProvider'

vi.mock('../api', () => ({
  foodly: {
    listTags: () => Promise.resolve([]),
    listUsers: () => Promise.resolve([]),
    me: () => Promise.resolve({ id: 1, name: 'Kolja', profilePicture: null }),
    listIngredients: () => Promise.resolve([{ id: 5, name: 'Zwiebel' }]),
    listCategories: () => categories(),
  },
}))

// Swapped per test: categories must not hold back the rest of the catalog.
let categories: () => Promise<unknown[]> = () => Promise.resolve([])
afterEach(() => {
  categories = () => Promise.resolve([])
})

function Probe() {
  return <span>ing:{useIngredient(5)?.name ?? '-'}</span>
}

it('loads ingredients into the catalog', async () => {
  render(
    <CatalogProvider>
      <Probe />
    </CatalogProvider>,
  )
  await waitFor(() => screen.getByText('ing:Zwiebel'))
})

function MeProbe() {
  const me = useMe()
  const cats = useCategories()
  return (
    <span>
      me:{me?.name ?? '-'} cats:{cats.status}:{cats.list.length}
    </span>
  )
}

it('exposes the current user', async () => {
  render(
    <CatalogProvider>
      <MeProbe />
    </CatalogProvider>,
  )
  await waitFor(() => screen.getByText(/me:Kolja/))
})

it('renders before the categories have loaded, then fills them in', async () => {
  let resolve: (rows: unknown[]) => void = () => {}
  categories = () => new Promise((r) => (resolve = r))
  render(
    <CatalogProvider>
      <MeProbe />
    </CatalogProvider>,
  )
  await waitFor(() => screen.getByText(/cats:loading:0/))
  resolve([{ id: 1, user: 1, name: 'Favoriten', recipes: [], order: 0, color: '', colorLight: null, colorDark: null }])
  await waitFor(() => screen.getByText(/cats:ready:1/))
})

it('still renders when the categories fail', async () => {
  categories = () => Promise.reject(new Error('boom'))
  render(
    <CatalogProvider>
      <MeProbe />
    </CatalogProvider>,
  )
  await waitFor(() => screen.getByText(/cats:error:0/))
})
