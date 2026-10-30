import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useListState } from './useListState'

// Stub the catalog hook so the test needs no provider.
vi.mock('../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1 }))

const wrapper =
  (initialEntries: string[]) =>
  ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>

beforeEach(() => localStorage.clear())

describe('useListState', () => {
  it('reads initial state from the URL', () => {
    const { result } = renderHook(() => useListState(), { wrapper: wrapper(['/?tag=Vegan&sort=rating']) })
    expect(result.current.state.tags).toEqual(['Vegan'])
    expect(result.current.state.sortKey).toBe('rating')
  })

  it('set() updates state and persists', () => {
    const { result } = renderHook(() => useListState(), { wrapper: wrapper(['/']) })
    act(() => result.current.set({ tags: ['Schnell'] }))
    expect(result.current.state.tags).toEqual(['Schnell'])
    expect(localStorage.getItem('foodly:list-state:1')).toContain('Schnell')
  })

  it('hydrates from localStorage when the URL is bare', () => {
    localStorage.setItem('foodly:list-state:1', JSON.stringify({ version: 1, state: { detail: 'compact' } }))
    const { result } = renderHook(() => useListState(), { wrapper: wrapper(['/']) })
    expect(result.current.state.detail).toBe('compact')
  })

  it('persists URL changes made outside set(), e.g. by a nav link', () => {
    const { result } = renderHook(() => ({ list: useListState(), navigate: useNavigate() }), {
      wrapper: wrapper(['/?sort=rating']),
    })
    act(() => result.current.navigate('/?cat=2&sort=rating'))
    expect(result.current.list.state.categories).toEqual([2])
    expect(JSON.parse(localStorage.getItem('foodly:list-state:1')!).state.categories).toEqual([2])
  })
})
