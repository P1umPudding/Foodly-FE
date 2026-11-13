import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CatalogProvider, useCategories, useIngredient, useMe, useRefreshCategories, useUser } from './CatalogProvider'

vi.mock('../api', () => ({
  foodly: {
    listTags: () => Promise.resolve([]),
    getUsers: (ids: number[]) => getUsers(ids),
    me: () => me(),
    listIngredients: () => Promise.resolve([{ id: 5, name: 'Zwiebel' }]),
    listCategories: () => categories(),
  },
}))

// Swapped per test: categories must not hold back the rest of the catalog.
let categories: () => Promise<unknown[]> = () => Promise.resolve([])
const kolja = { id: 1, name: 'Kolja', profilePicture: null }
let me: () => Promise<unknown> = () => Promise.resolve(kolja)
const knownUsers = [
  { id: 2, name: 'Mara', profilePicture: null },
  { id: 3, name: 'Jonas', profilePicture: null },
]
const getUsers = vi.fn((ids: number[]) => Promise.resolve(knownUsers.filter((u) => ids.includes(u.id))))
afterEach(() => {
  getUsers.mockClear()
  getUsers.mockImplementation((ids) => Promise.resolve(knownUsers.filter((u) => ids.includes(u.id))))
  categories = () => Promise.resolve([])
  me = () => Promise.resolve(kolja)
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

function category(id: number, recipes: number[] = []) {
  return { id, user: 1, name: `Kategorie ${id}`, recipes, order: id, color: '', colorLight: null, colorDark: null }
}

// A queue of pending listCategories calls, settled by the test in any order.
function deferredCategories() {
  const calls: { resolve: (rows: unknown[]) => void; reject: (e: Error) => void }[] = []
  categories = () => new Promise((resolve, reject) => calls.push({ resolve, reject }))
  return calls
}

function CategoriesProbe() {
  const cats = useCategories()
  const refresh = useRefreshCategories()
  return (
    <>
      <span>
        cats:{cats.status}:{cats.list.map((c) => `${c.id}/${c.recipes.length}`).join(',')}
      </span>
      <button onClick={refresh}>refresh</button>
      <button onClick={cats.retry}>retry</button>
    </>
  )
}

function renderCategories() {
  render(
    <CatalogProvider>
      <CategoriesProbe />
    </CatalogProvider>,
  )
}

it('refreshes the categories in the background, keeping the old list meanwhile', async () => {
  const calls = deferredCategories()
  renderCategories()
  await waitFor(() => expect(calls).toHaveLength(1))
  calls[0].resolve([category(1, [5])])
  await screen.findByText('cats:ready:1/1')

  fireEvent.click(screen.getByText('refresh'))
  expect(calls).toHaveLength(2)
  screen.getByText('cats:ready:1/1')
  calls[1].resolve([category(1, [])])
  await screen.findByText('cats:ready:1/0')
})

it('keeps only the latest refresh when responses arrive out of order', async () => {
  const calls = deferredCategories()
  renderCategories()
  await waitFor(() => expect(calls).toHaveLength(1))
  calls[0].resolve([category(1, [5])])
  await screen.findByText('cats:ready:1/1')

  fireEvent.click(screen.getByText('refresh'))
  fireEvent.click(screen.getByText('refresh'))
  calls[2].resolve([category(1, [5, 6, 7])])
  await screen.findByText('cats:ready:1/3')
  await act(async () => calls[1].resolve([category(1, [5, 6])]))
  screen.getByText('cats:ready:1/3')
})

it('keeps the loaded categories when a refresh fails', async () => {
  const calls = deferredCategories()
  renderCategories()
  await waitFor(() => expect(calls).toHaveLength(1))
  calls[0].resolve([category(1, [5])])
  await screen.findByText('cats:ready:1/1')

  fireEvent.click(screen.getByText('refresh'))
  await act(async () => calls[1].reject(new Error('offline')))
  screen.getByText('cats:ready:1/1')
})

it('retries failed categories from loading', async () => {
  const calls = deferredCategories()
  renderCategories()
  await waitFor(() => expect(calls).toHaveLength(1))
  calls[0].reject(new Error('boom'))
  await screen.findByText('cats:error:')

  fireEvent.click(screen.getByText('retry'))
  await screen.findByText('cats:loading:')
  calls[1].resolve([category(2)])
  await screen.findByText('cats:ready:2/0')
})

it('shows an error with a retry instead of the app when /users/me fails', async () => {
  let fail = true
  const calls = vi.fn()
  me = () => {
    calls()
    return fail ? Promise.reject(new Error('Serverfehler')) : Promise.resolve(kolja)
  }
  render(
    <CatalogProvider>
      <MeProbe />
    </CatalogProvider>,
  )
  await screen.findByText('Konnte Profil nicht laden')
  screen.getByText('Serverfehler')
  expect(screen.queryByText(/me:/)).toBeNull()

  fail = false
  fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
  await screen.findByText(/me:Kolja/)
  expect(calls).toHaveBeenCalledTimes(2)
  expect(screen.queryByText('Konnte Profil nicht laden')).toBeNull()
})

it('keeps a successful first load when a refresh started meanwhile fails', async () => {
  const calls = deferredCategories()
  renderCategories()
  await waitFor(() => expect(calls).toHaveLength(1))

  fireEvent.click(screen.getByText('refresh'))
  await act(async () => calls[0].resolve([category(1, [5])]))
  screen.getByText('cats:ready:1/1')
  await act(async () => calls[1].reject(new Error('offline')))
  screen.getByText('cats:ready:1/1')
})

it('waits for the first load when a refresh started meanwhile fails first', async () => {
  const calls = deferredCategories()
  renderCategories()
  await waitFor(() => expect(calls).toHaveLength(1))

  fireEvent.click(screen.getByText('refresh'))
  await act(async () => calls[1].reject(new Error('offline')))
  screen.getByText('cats:loading:')
  await act(async () => calls[0].resolve([category(1, [5])]))
  screen.getByText('cats:ready:1/1')
})

it('reports the error once every call in flight has failed', async () => {
  const calls = deferredCategories()
  renderCategories()
  await waitFor(() => expect(calls).toHaveLength(1))

  fireEvent.click(screen.getByText('refresh'))
  await act(async () => calls[1].reject(new Error('offline')))
  await act(async () => calls[0].reject(new Error('boom')))
  screen.getByText('cats:error:')
})

it('keeps categories a refresh loaded when a later retry fails', async () => {
  const calls = deferredCategories()
  renderCategories()
  await waitFor(() => expect(calls).toHaveLength(1))
  await act(async () => calls[0].reject(new Error('boom')))
  screen.getByText('cats:error:')

  fireEvent.click(screen.getByText('refresh'))
  fireEvent.click(screen.getByText('retry'))
  await act(async () => calls[1].resolve([category(1, [5])]))
  screen.getByText('cats:ready:1/1')
  await act(async () => calls[2].reject(new Error('offline')))
  screen.getByText('cats:ready:1/1')
})

it('only lets the remounted load land in StrictMode', async () => {
  const calls = deferredCategories()
  render(
    <StrictMode>
      <CatalogProvider>
        <CategoriesProbe />
      </CatalogProvider>
    </StrictMode>,
  )
  await waitFor(() => expect(calls).toHaveLength(2))

  await act(async () => calls[1].resolve([category(1, [5])]))
  screen.getByText('cats:ready:1/1')
  await act(async () => calls[0].resolve([category(1, [])]))
  screen.getByText('cats:ready:1/1')
})

describe('users on demand', () => {
  function UserProbe({ id }: { id: number }) {
    return (
      <span>
        user{id}:{useUser(id)?.name ?? '-'}
      </span>
    )
  }

  // Keyed by position: rerendering with an id appended mounts a fresh probe, whose effect asks again.
  function renderProbes(ids: number[]) {
    const tree = (list: number[]) => (
      <StrictMode>
        <CatalogProvider>
          {list.map((id, index) => (
            <UserProbe key={index} id={id} />
          ))}
        </CatalogProvider>
      </StrictMode>
    )
    const view = render(tree(ids))
    return { ...view, rerenderWith: (list: number[]) => view.rerender(tree(list)) }
  }

  it('fetches the ids of one render in one request, and not again on a rerender', async () => {
    const view = renderProbes([2, 3])
    await waitFor(() => screen.getByText('user2:Mara'))
    screen.getByText('user3:Jonas')
    view.rerenderWith([2, 3, 2])
    await act(async () => {})
    expect(getUsers).toHaveBeenCalledTimes(1)
    expect(getUsers).toHaveBeenCalledWith([2, 3])
  })

  it('asks for an unknown id only once', async () => {
    const view = renderProbes([9])
    await waitFor(() => expect(getUsers).toHaveBeenCalledTimes(1))
    await act(async () => {})
    view.rerenderWith([9, 9])
    await act(async () => {})
    expect(screen.getAllByText('user9:-')).toHaveLength(2)
    expect(getUsers).toHaveBeenCalledTimes(1)
  })

  it('knows the current user without a request', async () => {
    renderProbes([1])
    await waitFor(() => screen.getByText('user1:Kolja'))
    await act(async () => {})
    expect(getUsers).not.toHaveBeenCalled()
  })

  it('shows no name after a failed request and does not retry', async () => {
    getUsers.mockImplementation(() => Promise.reject(new Error('boom')))
    const view = renderProbes([2])
    await waitFor(() => expect(getUsers).toHaveBeenCalledTimes(1))
    await act(async () => {})
    view.rerenderWith([2, 2])
    await act(async () => {})
    expect(screen.getAllByText('user2:-')).toHaveLength(2)
    expect(getUsers).toHaveBeenCalledTimes(1)
  })
})
