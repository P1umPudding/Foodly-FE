import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, useNavigate, useNavigationType } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useListState } from './useListState'
import { DEFAULT_STATE } from './state'

// Stub the catalog hook so the test needs no provider.
vi.mock('../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1 }))

const wrapper =
  (initialEntries: string[], initialIndex?: number) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      {children}
    </MemoryRouter>
  )

// List state plus history control; starts on a filtered list with an unrelated page before it.
const renderWithHistory = () =>
  renderHook(() => ({ list: useListState(), navigate: useNavigate(), type: useNavigationType() }), {
    wrapper: wrapper(['/other', '/?cat=1'], 1),
  })

type Harness = ReturnType<typeof renderWithHistory>['result']

// Each keystroke reads the current callback: setSearch changes with every location.
const typeSearch = (result: Harness, text: string) => {
  for (let i = 1; i <= text.length; i++) act(() => result.current.list.setSearch(text.slice(0, i)))
}
const back = (result: Harness) => act(() => result.current.navigate(-1))

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

  describe('setSearch', () => {
    it('gives a whole search one history entry, so Back returns to the state before it', () => {
      const { result } = renderWithHistory()
      act(() => result.current.list.set({ tags: ['Vegan'] }))
      typeSearch(result, 'pasta')
      expect(result.current.list.state.search).toBe('pasta')

      back(result)
      expect(result.current.list.state).toMatchObject({ search: '', tags: ['Vegan'], categories: [1] })
      back(result)
      expect(result.current.list.state).toMatchObject({ search: '', tags: [], categories: [1] })
      back(result)
      expect(result.current.list.state.categories).toEqual([])
    })

    it('pushes on the first keystroke and replaces afterwards', () => {
      const { result } = renderWithHistory()
      act(() => result.current.list.setSearch('p'))
      expect(result.current.type).toBe('PUSH')
      act(() => result.current.list.setSearch('pa'))
      expect(result.current.type).toBe('REPLACE')
    })

    it('reuses the search entry when clearing and retyping', () => {
      const { result } = renderWithHistory()
      act(() => result.current.list.set({ tags: ['Vegan'] }))
      typeSearch(result, 'pasta')
      act(() => result.current.list.setSearch(''))
      expect(result.current.type).toBe('REPLACE')
      expect(result.current.list.state.search).toBe('')
      typeSearch(result, 'nudel')

      back(result)
      expect(result.current.list.state).toMatchObject({ search: '', tags: ['Vegan'] })
      back(result)
      expect(result.current.list.state).toMatchObject({ tags: [], categories: [1] })
    })

    it('leaves one entry showing the pre-search list after clearing (accepted trade-off)', () => {
      const { result } = renderWithHistory()
      act(() => result.current.list.set({ tags: ['Vegan'] }))
      typeSearch(result, 'pasta')
      act(() => result.current.list.setSearch(''))
      const cleared = result.current.list.state

      back(result)
      expect(result.current.list.state).toEqual(cleared)
    })

    it('adds no entry for a blank search and does not mark the filter entry as a search', () => {
      const { result } = renderWithHistory()
      act(() => result.current.list.setSearch('  '))
      expect(result.current.type).toBe('REPLACE')
      act(() => result.current.list.setSearch('p'))
      expect(result.current.type).toBe('PUSH')
    })

    it('starts a new entry when editing a search opened from a link', () => {
      const { result } = renderHook(
        () => ({ list: useListState(), navigate: useNavigate(), type: useNavigationType() }),
        { wrapper: wrapper(['/?q=pas']) },
      )
      act(() => result.current.list.setSearch('past'))
      expect(result.current.type).toBe('PUSH')
      act(() => result.current.list.setSearch('pasta'))
      expect(result.current.type).toBe('REPLACE')
      act(() => result.current.navigate(-1))
      expect(result.current.list.state.search).toBe('pas')
    })

    it('does not overwrite an older search reached with Back', () => {
      const { result } = renderWithHistory()
      typeSearch(result, 'pasta')
      act(() => result.current.list.set({ tags: ['Vegan'] }))
      back(result)
      expect(result.current.list.state).toMatchObject({ search: 'pasta', tags: [] })
      act(() => result.current.list.setSearch(''))
      expect(result.current.type).toBe('PUSH')
      act(() => result.current.list.setSearch('n'))
      expect(result.current.type).toBe('REPLACE')
      back(result)
      expect(result.current.list.state).toMatchObject({ search: 'pasta', tags: [] })
    })

    it('keeps a linked search reachable with Back after clearing it', () => {
      const { result } = renderHook(() => ({ list: useListState(), navigate: useNavigate() }), {
        wrapper: wrapper(['/other', '/?q=pas'], 1),
      })
      act(() => result.current.list.setSearch(''))
      expect(result.current.list.state.search).toBe('')
      act(() => result.current.navigate(-1))
      expect(result.current.list.state.search).toBe('pas')
    })

    it('keeps persisting the other list state', () => {
      const { result } = renderWithHistory()
      act(() => result.current.list.set({ tags: ['Schnell'] }))
      act(() => result.current.list.setSearch('p'))
      expect(JSON.parse(localStorage.getItem('foodly:list-state:1')!).state.tags).toEqual(['Schnell'])
    })
  })

  it('still pushes filter and sort changes', () => {
    const { result } = renderWithHistory()
    act(() => result.current.list.set({ sortKey: 'rating' }))
    expect(result.current.type).toBe('PUSH')
    back(result)
    expect(result.current.list.state.sortKey).toBe(DEFAULT_STATE.sortKey)
  })
})
