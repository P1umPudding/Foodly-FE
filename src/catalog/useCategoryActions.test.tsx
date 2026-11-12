import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CatalogProvider, useCategories, useRefreshCategories } from './CatalogProvider'
import { useCategoryActions } from './useCategoryActions'
import type { UserCategory } from '../api/protocol'

const api = vi.hoisted(() => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  setCategoryRecipes: vi.fn(),
  reorderCategories: vi.fn(),
}))
vi.mock('../api', () => ({
  foodly: {
    listTags: () => Promise.resolve([]),
    listUsers: () => Promise.resolve([]),
    me: () => Promise.resolve({ id: 1, name: 'Kolja', profilePicture: null }),
    listIngredients: () => Promise.resolve([]),
    ...api,
  },
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const cat = (id: number, order: number, name = `K${id}`): UserCategory => ({
  id,
  user: 1,
  name,
  recipes: [],
  order,
  color: '#e11d48',
  colorLight: null,
  colorDark: null,
})
const input = { name: 'Neu', color: '#16a34a', colorLight: null, colorDark: null }
const server = [cat(1, 0), cat(2, 1), cat(3, 2)]

beforeEach(() => {
  api.listCategories.mockResolvedValue(server)
})
afterEach(() => {
  vi.resetAllMocks()
})

function wrapper({ children }: { children: ReactNode }) {
  return <CatalogProvider>{children}</CatalogProvider>
}

async function renderActions() {
  const hook = renderHook(
    () => ({ categories: useCategories(), actions: useCategoryActions(), refresh: useRefreshCategories() }),
    { wrapper },
  )
  await waitFor(() => expect(hook.result.current?.categories.status).toBe('ready'))
  return hook.result
}

const ids = (list: UserCategory[]) => list.map((c) => c.id)
const orders = (list: UserCategory[]) => Object.fromEntries(list.map((c) => [c.id, c.order]))

it('puts the answer of update and setRecipes into the list', async () => {
  const result = await renderActions()
  api.updateCategory.mockResolvedValue({ ...server[1], name: 'Umbenannt' })
  api.setCategoryRecipes.mockResolvedValue({ ...server[2], recipes: [7] })

  await act(() => result.current.actions.update(2, { ...input, name: 'Umbenannt' }))
  await act(() => result.current.actions.setRecipes(3, [7]))

  expect(api.updateCategory).toHaveBeenCalledWith(2, { ...input, name: 'Umbenannt' })
  expect(api.setCategoryRecipes).toHaveBeenCalledWith(3, [7])
  expect(result.current.categories.list.map((c) => [c.name, c.recipes])).toEqual([
    ['K1', []],
    ['Umbenannt', []],
    ['K3', [7]],
  ])
})

it('rethrows a failed write and leaves the list alone', async () => {
  const result = await renderActions()
  api.deleteCategory.mockRejectedValue(new Error('boom'))

  await act(() => expect(result.current.actions.remove(2)).rejects.toThrow('boom'))

  expect(ids(result.current.categories.list)).toEqual([1, 2, 3])
})

it('keeps a created category when an older refresh lands after it, and loads again', async () => {
  const result = await renderActions()
  const stale = deferred<UserCategory[]>()
  api.listCategories.mockReturnValueOnce(stale.promise).mockResolvedValue([...server, cat(4, 3, 'Neu')])
  api.createCategory.mockResolvedValue(cat(4, 3, 'Neu'))

  act(() => result.current.refresh())
  await act(() => result.current.actions.create(input))
  expect(ids(result.current.categories.list)).toEqual([1, 2, 3, 4])

  await act(async () => stale.resolve(server))
  expect(ids(result.current.categories.list)).toEqual([1, 2, 3, 4])
  expect(api.listCategories).toHaveBeenCalledTimes(3)
})

it('gives a list that lands during a pending reorder the new order', async () => {
  const result = await renderActions()
  const put = deferred<void>()
  api.reorderCategories.mockReturnValue(put.promise)

  let reorder!: Promise<void>
  act(() => {
    reorder = result.current.actions.reorder([3, 2, 1])
  })
  await act(async () => result.current.refresh())
  expect(api.listCategories).toHaveBeenCalledTimes(2)
  expect(ids(result.current.categories.list)).toEqual([3, 2, 1])

  await act(async () => put.resolve())
  await reorder
  expect(orders(result.current.categories.list)).toEqual({ 3: 0, 2: 1, 1: 2 })
})

it('runs reorders one after another; the latest decides', async () => {
  const result = await renderActions()
  const first = deferred<void>()
  const second = deferred<void>()
  api.reorderCategories.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

  let a!: Promise<void>
  let b!: Promise<void>
  act(() => {
    a = result.current.actions.reorder([2, 1, 3])
  })
  act(() => {
    b = result.current.actions.reorder([2, 3, 1])
  })
  const aFailed = expect(a).rejects.toThrow('first')
  await act(async () => {})
  expect(api.reorderCategories).toHaveBeenCalledTimes(1)

  await act(async () => first.reject(new Error('first')))
  await aFailed
  expect(ids(result.current.categories.list)).toEqual([2, 3, 1])
  expect(api.reorderCategories).toHaveBeenCalledTimes(2)

  await act(async () => second.resolve())
  await b
  expect(orders(result.current.categories.list)).toEqual({ 2: 0, 3: 1, 1: 2 })
})

it('rolls a failed latest reorder back to the last accepted order', async () => {
  const result = await renderActions()
  const second = deferred<void>()
  api.reorderCategories.mockResolvedValueOnce(undefined).mockReturnValueOnce(second.promise)

  let a!: Promise<void>
  let b!: Promise<void>
  act(() => {
    a = result.current.actions.reorder([2, 1, 3])
  })
  act(() => {
    b = result.current.actions.reorder([3, 2, 1])
  })
  const bFailed = expect(b).rejects.toThrow('second')
  await act(() => a)
  await act(async () => second.reject(new Error('second')))
  await bFailed

  expect(ids(result.current.categories.list)).toEqual([2, 1, 3])
  expect(orders(result.current.categories.list)).toEqual({ 2: 0, 1: 1, 3: 2 })
})

it('ignores ids in a reorder that are not in the list', async () => {
  const result = await renderActions()
  api.reorderCategories.mockResolvedValue(undefined)

  await act(() => result.current.actions.reorder([9, 3, 1, 2]))

  expect(ids(result.current.categories.list)).toEqual([3, 1, 2])
  expect(orders(result.current.categories.list)).toEqual({ 3: 1, 1: 2, 2: 3 })
})

it('does not reorder before the categories are loaded, but still writes and then loads', async () => {
  const first = deferred<UserCategory[]>()
  api.listCategories.mockReturnValueOnce(first.promise).mockResolvedValue([...server, cat(4, 3, 'Neu')])
  api.createCategory.mockResolvedValue(cat(4, 3, 'Neu'))
  const hook = renderHook(() => ({ categories: useCategories(), actions: useCategoryActions() }), { wrapper })
  await waitFor(() => expect(hook.result.current?.categories.status).toBe('loading'))

  await act(() =>
    expect(hook.result.current.actions.reorder([3, 2, 1])).rejects.toThrow('Kategorien sind noch nicht geladen'),
  )
  expect(api.reorderCategories).not.toHaveBeenCalled()

  await act(() => hook.result.current.actions.create(input))
  await waitFor(() => expect(ids(hook.result.current.categories.list)).toEqual([1, 2, 3, 4]))
  expect(hook.result.current.categories.status).toBe('ready')
})
