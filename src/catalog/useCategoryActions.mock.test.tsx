import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { UserCategory } from '../api/protocol'

// Mock mode is decided when src/api loads: every app module is imported fresh with VITE_MOCK=1, so the spies below
// hit the same foodly the catalog uses, and each test gets fresh mock data.
let api: typeof import('../api')
let catalog: typeof import('./CatalogProvider')
let useCategoryActions: typeof import('./useCategoryActions').useCategoryActions

beforeEach(async () => {
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  api = await import('../api')
  catalog = await import('./CatalogProvider')
  ;({ useCategoryActions } = await import('./useCategoryActions'))
  await api.bootstrap()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

async function renderActions() {
  const { CatalogProvider, useCategories } = catalog
  const wrapper = ({ children }: { children: ReactNode }) => <CatalogProvider>{children}</CatalogProvider>
  const hook = renderHook(() => ({ categories: useCategories(), actions: useCategoryActions() }), { wrapper })
  await waitFor(() => expect(hook.result.current?.categories.status).toBe('ready'), { timeout: 3000 })
  return hook.result
}

const ids = (list: UserCategory[]) => list.map((c) => c.id)
// Each mock call waits 250 ms, and the first render pays for the fresh module graph.
const SLOW = 10_000

it(
  'shows a created category without reloading and drops it after remove',
  async () => {
    const result = await renderActions()
    const listCategories = vi.spyOn(api.foodly, 'listCategories')

    let created!: UserCategory
    await act(async () => {
      created = await result.current.actions.create({
        name: 'Suppen',
        color: '#16a34a',
        colorLight: null,
        colorDark: null,
      })
    })
    expect(result.current.categories.list.find((c) => c.id === created.id)?.name).toBe('Suppen')

    await act(() => result.current.actions.remove(created.id))
    expect(ids(result.current.categories.list)).not.toContain(created.id)
    expect(listCategories).not.toHaveBeenCalled()
  },
  SLOW,
)

it(
  'shows a new order at once and restores the old one when the reorder fails',
  async () => {
    const result = await renderActions()
    const before = result.current.categories.list
    const reversed = ids(before).reverse()
    let fail!: (error: Error) => void
    vi.spyOn(api.foodly, 'reorderCategories').mockReturnValue(new Promise((_, reject) => (fail = reject)))

    let reorder!: Promise<void>
    act(() => {
      reorder = result.current.actions.reorder(reversed)
    })
    const failed = expect(reorder).rejects.toThrow('boom')
    expect(ids(result.current.categories.list)).toEqual(reversed)
    expect(result.current.categories.list.map((c) => c.order)).toEqual(reversed.map((_, index) => index))

    await act(async () => fail(new Error('boom')))
    await failed
    expect(ids(result.current.categories.list)).toEqual(ids(before))
    expect(result.current.categories.list.map((c) => c.order)).toEqual(before.map((c) => c.order))
  },
  SLOW,
)
