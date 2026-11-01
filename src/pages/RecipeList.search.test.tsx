import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './RecipeList'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { SHELL_NAV_STATE } from '../components/shell/nav'
import type { Recipe, UserCategory } from '../api/protocol'

function cat(id: number, recipes: number[]): UserCategory {
  return { id, user: 1, name: `Cat ${id}`, recipes, order: id, color: '#000000', colorLight: null, colorDark: null }
}

function rec(id: number, name: string): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    name,
    tags: [],
    source: null,
    rating: [],
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: null,
    sizeText: null,
    notes: [],
    mainImage: null,
    images: [],
    sections: [],
  }
}

// The catalog context the page reads from.
vi.mock('../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
  // Goes through the real foodly.listCategories, so each test's spy decides the categories.
  useCategories: () => {
    const req = useRequest(() => foodly.listCategories(), [])
    return { list: req.data ?? [], status: req.status }
  },
}))

// categories=[] makes every recipe "uncategorised", and that group starts
// collapsed by default (see RecipeList's `loadCollapsed(...) ?? ['uncat']`),
// which would unmount its rows entirely. Force the flat (ungrouped) view via the
// URL so tests assert on rendered content, not on collapse defaults.
function renderList() {
  return render(
    <MemoryRouter initialEntries={['/recipes?group=0']}>
      <TooltipProvider>
        <RecipeList />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('RecipeList (server-side search)', () => {
  it('renders recipes returned by searchRecipes', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()

    // No @testing-library/jest-dom in this project (toBeInTheDocument isn't
    // available) — getByText already throws until found, so plain waitFor
    // retries until the element exists (see CatalogProvider.test.tsx for the
    // same idiom).
    await waitFor(() => screen.getByText('Pancakes'))
  })

  it('hides recipes outside the selected category instead of bucketing them as uncategorised', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({
      items: [rec(1, 'Pancakes'), rec(2, 'Waffles')],
      cursor: null,
    })
    // Category 1 contains only recipe 1 — selecting it must hide recipe 2 entirely.
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([cat(1, [1])])

    render(
      <MemoryRouter initialEntries={['/recipes?cat=1&group=0']}>
        <TooltipProvider>
          <RecipeList />
        </TooltipProvider>
      </MemoryRouter>,
    )

    await waitFor(() => screen.getByText('Pancakes'))
    expect(screen.queryByText('Waffles')).toBeNull()
  })

  it('loads the next page when the sentinel intersects', async () => {
    // Capture the sentinel's IntersectionObserver callback so we can drive an
    // intersection by hand (jsdom never fires one on its own). Scoped to this
    // test and restored in afterEach so it can't leak into other suites.
    let intersect: IntersectionObserverCallback | null = null
    const realIO = globalThis.IntersectionObserver
    class CapturingIO {
      constructor(cb: IntersectionObserverCallback) {
        intersect = cb
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    globalThis.IntersectionObserver = CapturingIO as unknown as typeof IntersectionObserver
    afterEach(() => {
      globalThis.IntersectionObserver = realIO
    })

    const searchSpy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1, 'Pancakes')], cursor: 2 })
      .mockResolvedValueOnce({ items: [rec(2, 'Waffles')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()

    await waitFor(() => screen.getByText('Pancakes'))
    expect(searchSpy).toHaveBeenCalledTimes(1)

    // Fire the intersection → loadMore() → page 2 fetch.
    await act(async () => {
      intersect?.([{ isIntersecting: true } as IntersectionObserverEntry], null as unknown as IntersectionObserver)
    })

    await waitFor(() => screen.getByText('Waffles'))
    expect(searchSpy).toHaveBeenCalledTimes(2)
    // Page 1 still present — loadMore appends, never replaces.
    screen.getByText('Pancakes')
  })

  describe('scroll restore', () => {
    function renderAt(entry: string | { pathname: string; search: string; state: unknown }) {
      return render(
        <MemoryRouter initialEntries={[entry]}>
          <TooltipProvider>
            <RecipeList />
          </TooltipProvider>
        </MemoryRouter>,
      )
    }

    afterEach(() => sessionStorage.clear())

    it('returns to the saved position of the same list', async () => {
      vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      // Saved as the list writes it (defaults omitted); a nav link's explicit group=1 is the same list.
      sessionStorage.setItem('recipeList:scroll', JSON.stringify({ list: 'q=Pan&group=0', y: 640 }))
      renderAt('/recipes?q=Pan&group=0&dir=asc')
      await waitFor(() => screen.getByText('Pancakes'))
      expect(scrollTo).toHaveBeenCalledWith(0, 640)
    })

    it('does not record scroll events from the loading page over the position to restore', async () => {
      let resolve: (v: { items: Recipe[]; cursor: null }) => void = () => {}
      vi.spyOn(foodly, 'searchRecipes').mockReturnValue(new Promise((r) => (resolve = r)))
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      const saved = JSON.stringify({ list: 'group=0', y: 640 })
      sessionStorage.setItem('recipeList:scroll', saved)
      renderAt('/recipes?group=0')
      // the short skeleton page clamps the old position → a scroll event at y=0
      window.dispatchEvent(new Event('scroll'))
      expect(sessionStorage.getItem('recipeList:scroll')).toBe(saved)
      await act(async () => resolve({ items: [rec(1, 'Pancakes')], cursor: null }))
      await waitFor(() => screen.getByText('Pancakes'))
      expect(scrollTo).toHaveBeenCalledWith(0, 640)
    })

    // From a recipe page, a sidebar link (router state SHELL_NAV_STATE) opens the list; Back from a
    // recipe returns to it.
    function renderFlow(entries: Array<string | { pathname: string; search: string; state: unknown }>, index: number) {
      let goBack: () => void = () => {}
      function Detail() {
        const navigate = useNavigate()
        goBack = () => navigate(-1)
        return (
          <Link to="/recipes?group=0" state={SHELL_NAV_STATE}>
            open list
          </Link>
        )
      }
      render(
        <MemoryRouter initialEntries={entries} initialIndex={index}>
          <TooltipProvider>
            <Routes>
              <Route path="/recipes" element={<RecipeList />} />
              <Route path="/recipes/:id" element={<Detail />} />
            </Routes>
          </TooltipProvider>
        </MemoryRouter>,
      )
      return { back: () => act(() => goBack()) }
    }

    it('opens from the top when a shell nav link opened the list', async () => {
      vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      sessionStorage.setItem('recipeList:scroll', JSON.stringify({ list: 'group=0', y: 640 }))
      renderFlow(['/recipes/1'], 0)
      fireEvent.click(screen.getByText('open list'))
      await waitFor(() => screen.getByText('Pancakes'))
      expect(scrollTo).toHaveBeenCalledWith(0, 0)
      expect(scrollTo).not.toHaveBeenCalledWith(0, 640)
    })

    it('restores on Back to a list that a shell nav link had opened', async () => {
      vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      sessionStorage.setItem('recipeList:scroll', JSON.stringify({ list: 'group=0', y: 640 }))
      const { back } = renderFlow(
        [{ pathname: '/recipes', search: '?group=0', state: SHELL_NAV_STATE }, '/recipes/1'],
        1,
      )
      back()
      await waitFor(() => screen.getByText('Pancakes'))
      expect(scrollTo).toHaveBeenCalledWith(0, 640)
      expect(scrollTo).not.toHaveBeenCalledWith(0, 0)
    })

    it('starts at the top when the position belongs to another list', async () => {
      vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      sessionStorage.setItem('recipeList:scroll', JSON.stringify({ list: 'cat=7&group=0', y: 640 }))
      renderAt('/recipes?group=0')
      await waitFor(() => screen.getByText('Pancakes'))
      expect(scrollTo).not.toHaveBeenCalled()
    })
  })
})

describe('RecipeList (layout)', () => {
  it('keeps room below the list for the phone "+" button, desktop padding unchanged', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()
    await waitFor(() => screen.getByText('Pancakes'))

    // jsdom has no layout (and its width doesn't matter here), so the classes stand in for the geometry:
    // the FAB's top edge must stay below the last card when scrolled to the end (#74).
    const wrapper = screen.getByRole('heading', { name: 'Rezepte' }).closest('.grid')!
    expect(wrapper.classList.contains('pb-10')).toBe(true)
    expect(wrapper.classList.contains('phone:pb-[calc(6rem+env(safe-area-inset-bottom))]')).toBe(true)
  })
})
