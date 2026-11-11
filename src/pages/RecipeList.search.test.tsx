import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './RecipeList'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { SHELL_NAV_STATE } from '../components/shell/nav'
import type { Recipe, UserCategory } from '../api/protocol'
import { ref } from '../test/images'

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
  useUser: () => undefined,
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
function renderList(url = '/recipes?group=0') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TooltipProvider>
        <RecipeList />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RecipeList (server-side search)', () => {
  describe('loading skeletons take the shape of the view', () => {
    const never = () => new Promise<never>(() => {})
    afterEach(() => vi.unstubAllGlobals())

    it('tiles: 4:3 tile skeletons', async () => {
      vi.spyOn(foodly, 'searchRecipes').mockImplementation(never)
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

      renderList('/recipes?view=tiles&group=0')

      await waitFor(() => expect(screen.getAllByTestId('tile-skeleton')).toHaveLength(4))
      expect(screen.queryAllByTestId('row-skeleton')).toHaveLength(0)
    })

    it('rows: no tile skeletons', async () => {
      vi.spyOn(foodly, 'searchRecipes').mockImplementation(never)
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

      renderList()

      await waitFor(() => expect(screen.getAllByTestId('row-skeleton')).toHaveLength(4))
      expect(screen.queryAllByTestId('tile-skeleton')).toHaveLength(0)
    })

    it('tiles: loading more shows one row of tile skeletons (flat)', async () => {
      let intersect: IntersectionObserverCallback | null = null
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
      vi.stubGlobal('IntersectionObserver', CapturingIO)
      vi.spyOn(foodly, 'searchRecipes')
        .mockResolvedValueOnce({ items: [rec(1, 'Pancakes')], cursor: 2 })
        .mockImplementationOnce(never)
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

      renderList('/recipes?view=tiles&group=0')
      await waitFor(() => screen.getByTestId('tile-type-name'))
      await act(async () => {
        intersect?.([{ isIntersecting: true } as IntersectionObserverEntry], null as unknown as IntersectionObserver)
      })

      const more = await waitFor(() => screen.getByTestId('list-more-skeleton'))
      expect(within(more).getAllByTestId('tile-skeleton')).toHaveLength(4)
      expect(within(more).getByTestId('tile-grid').className).toContain('auto-rows-[0]')
    })

    it('tiles: grouped, the load-more skeleton is indented like a group body', async () => {
      let intersect: IntersectionObserverCallback | null = null
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
      vi.stubGlobal('IntersectionObserver', CapturingIO)
      vi.spyOn(foodly, 'searchRecipes')
        .mockResolvedValueOnce({ items: [rec(1, 'Pancakes')], cursor: 2 })
        .mockImplementationOnce(never)
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([cat(1, [1])])

      renderList('/recipes?view=tiles')
      await waitFor(() => screen.getByTestId('tile-type-name'))
      await act(async () => {
        intersect?.([{ isIntersecting: true } as IntersectionObserverEntry], null as unknown as IntersectionObserver)
      })

      const more = await waitFor(() => screen.getByTestId('list-more-skeleton'))
      expect(within(more).getAllByTestId('tile-skeleton')).toHaveLength(4)
      expect(more.parentElement?.className).toContain('border-transparent')
    })

    it('tiles: a pending search with nothing visible yet shows a tile skeleton', async () => {
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
          takeRecords() {
            return []
          }
        },
      )
      vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: 2 })
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

      renderList('/recipes?view=tiles&group=0&q=zzz')

      const pending = await waitFor(() => screen.getByTestId('list-pending-skeleton'))
      expect(within(pending).getAllByTestId('tile-skeleton')).toHaveLength(1)
    })

    it('tiles: renders the recipes as tiles once loaded', async () => {
      vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

      renderList('/recipes?view=tiles&group=0')

      await waitFor(() => expect(screen.getByTestId('tile-type-name').textContent).toBe('Pancakes'))
      expect(screen.queryAllByTestId('tile-skeleton')).toHaveLength(0)
    })
  })

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
    const wrapper = screen.getByTestId('recipe-list-page')
    expect(wrapper.classList.contains('pb-10')).toBe(true)
    expect(wrapper.classList.contains('phone:pb-[calc(6rem+env(safe-area-inset-bottom))]')).toBe(true)
  })
})

describe('RecipeList (filter bar)', () => {
  it('shows the five filter buttons in place of the filter rail; the list gets the full width', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()
    await waitFor(() => screen.getByText('Pancakes'))

    const bar = screen.getByRole('group', { name: 'Filter' })
    for (const name of ['Kategorie', 'Tags', 'Zutaten', 'Arbeitszeit', 'Zugriff']) {
      expect(within(bar).getByRole('button', { name })).toBeTruthy()
    }
    expect(document.querySelector('aside')).toBeNull()
    // The phone filter sheet's trigger is gone too.
    expect(screen.queryByRole('button', { name: 'Filter' })).toBeNull()
    expect(screen.getByTestId('recipe-list-page').classList.contains('grid')).toBe(false)
  })

  it('offers "Alle Filter zurücksetzen" only while a filter or the search is active', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    const plain = renderList()
    await waitFor(() => screen.getByText('Pancakes'))
    expect(screen.queryByRole('button', { name: 'Alle Filter zurücksetzen' })).toBeNull()
    plain.unmount()

    for (const url of ['/recipes?group=0&tag=Vegan', '/recipes?group=0&q=pan']) {
      const view = renderList(url)
      await waitFor(() => screen.getByText('Pancakes'))
      expect(screen.getByRole('button', { name: 'Alle Filter zurücksetzen' })).toBeTruthy()
      view.unmount()
    }
  })

  it('"Alle Filter zurücksetzen" clears every filter and the search, but keeps the sort', async () => {
    const searchSpy = vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList('/recipes?group=0&sort=rating&tag=Vegan&dmax=30&q=pan')
    await waitFor(() => screen.getByText('Pancakes'))
    const bar = screen.getByRole('group', { name: 'Filter' })
    expect(within(bar).getByRole('button', { name: 'Tags: Vegan' })).toBeTruthy()

    // The page focused the search on open; start from the link, as a keyboard user would.
    const reset = screen.getByRole('button', { name: 'Alle Filter zurücksetzen' })
    reset.focus()
    expect(document.activeElement).toBe(reset)
    fireEvent.click(reset)

    await waitFor(() => expect(searchSpy.mock.lastCall?.[0].filters).toBeUndefined())
    expect(within(bar).getByRole('button', { name: 'Tags' })).toBeTruthy()
    expect(within(bar).getByRole('button', { name: 'Arbeitszeit' })).toBeTruthy()
    expect((screen.getByRole('textbox', { name: 'Rezepte suchen' }) as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('button', { name: 'Alle Filter zurücksetzen' })).toBeNull()
    // The link is gone, so focus moves to the search instead of falling to <body>.
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Rezepte suchen' }))
    expect(screen.getByRole('button', { name: /^Sortieren: Bewertung/ })).toBeTruthy()
  })
})

describe('RecipeList (result count and empty states)', () => {
  // A free-text search narrows only the loaded pages on the client, so page 1 can hold no match while
  // later pages still might.
  function renderSearch(q: string) {
    return render(
      <MemoryRouter initialEntries={[`/recipes?group=0&q=${q}`]}>
        <TooltipProvider>
          <RecipeList />
        </TooltipProvider>
      </MemoryRouter>,
    )
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  function emptyStateIcon(text: string) {
    return screen.getByText(text).parentElement?.querySelector('svg')
  }

  it('says "Keine Treffer" when a server-side filter leaves no recipe, and resetting shows the list (#128)', async () => {
    const searchSpy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockImplementation(async (q) =>
        q.filters?.tags ? { items: [], cursor: null } : { items: [rec(1, 'Pancakes')], cursor: null },
      )
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList('/recipes?group=0&tag=Vegan')

    await waitFor(() => screen.getByText('Keine Treffer für die aktuellen Filter.'))
    expect(screen.queryByText('Noch keine Rezepte.')).toBeNull()
    const icon = emptyStateIcon('Keine Treffer für die aktuellen Filter.')
    expect(icon?.classList.contains('size-5')).toBe(true)
    expect(icon?.classList.contains('h-10')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }))

    await waitFor(() => screen.getByText('Pancakes'))
    expect(searchSpy.mock.lastCall?.[0].filters).toBeUndefined()
    expect(screen.queryByText('Keine Treffer für die aktuellen Filter.')).toBeNull()
  })

  it.each(['tag=Vegan', 'ing=1', 'dmax=30', 'role=owner', 'collab=shared'])(
    'says "Keine Treffer", not "Noch keine Rezepte", for an empty result under %s',
    async (param) => {
      vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [], cursor: null })
      vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

      renderList(`/recipes?group=0&${param}`)

      await waitFor(() => screen.getByText('Keine Treffer für die aktuellen Filter.'))
      screen.getByRole('button', { name: 'Filter zurücksetzen' })
      expect(screen.queryByText('Noch keine Rezepte.')).toBeNull()
    },
  )

  it('says "Keine Treffer" for a client-side category filter over an empty result', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([cat(1, [])])

    renderList('/recipes?group=0&cat=1')

    await waitFor(() => screen.getByText('Keine Treffer für die aktuellen Filter.'))
    expect(screen.queryByText('Noch keine Rezepte.')).toBeNull()
  })

  it('says "Noch keine Rezepte" with a "Neues Rezept" link when no filter or search is active', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()

    await waitFor(() => screen.getByText('Noch keine Rezepte.'))
    expect(screen.getByRole('link', { name: 'Neues Rezept' }).getAttribute('href')).toMatch(/\/recipes\/new$/)
    expect(screen.queryByText('Keine Treffer für die aktuellen Filter.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Filter zurücksetzen' })).toBeNull()
    const icon = emptyStateIcon('Noch keine Rezepte.')
    expect(icon?.classList.contains('size-5')).toBe(true)
    expect(icon?.classList.contains('h-10')).toBe(false)
  })

  it('says "Keine Treffer" for a search over an empty collection', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderSearch('zzz')

    await waitFor(() => screen.getByText('Keine Treffer für die aktuellen Filter.'))
    expect(screen.queryByText('Noch keine Rezepte.')).toBeNull()
  })

  it('shows neither empty text while a filtered result still has pages to come', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [], cursor: 2 })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList('/recipes?group=0&tag=Vegan')

    await waitFor(() => screen.getByTestId('list-pending-skeleton'))
    expect(screen.queryByText('Keine Treffer für die aktuellen Filter.')).toBeNull()
    expect(screen.queryByText('Noch keine Rezepte.')).toBeNull()
  })

  it('shows a skeleton instead of "Keine Treffer" while more pages may hold matches', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: 2 })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderSearch('zzz')

    await waitFor(() => screen.getByTestId('list-pending-skeleton'))
    expect(screen.queryByText('Keine Treffer für die aktuellen Filter.')).toBeNull()
    expect(screen.queryByText('Filter zurücksetzen')).toBeNull()
  })

  it('keeps loading pages by itself while no row is visible', async () => {
    // Reports the sentinel as in view right after observe(), like a real observer does.
    class FiringIO {
      private disconnected = false
      constructor(private cb: IntersectionObserverCallback) {}
      observe() {
        queueMicrotask(() => {
          if (!this.disconnected)
            this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
        })
      }
      unobserve() {}
      disconnect() {
        this.disconnected = true
      }
      takeRecords() {
        return []
      }
    }
    vi.stubGlobal('IntersectionObserver', FiringIO)
    let resolvePage2: (page: Awaited<ReturnType<typeof foodly.searchRecipes>>) => void = () => {}
    const page2 = new Promise<Awaited<ReturnType<typeof foodly.searchRecipes>>>((resolve) => (resolvePage2 = resolve))
    const searchSpy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1, 'Pancakes')], cursor: 2 })
      .mockReturnValueOnce(page2)
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderSearch('zzz')

    await waitFor(() => expect(searchSpy).toHaveBeenCalledTimes(2))
    screen.getByTestId('list-pending-skeleton')
    // Page 2 is loading, but with no visible row the pending skeleton is the only one.
    expect(screen.queryByTestId('list-more-skeleton')).toBeNull()
    await act(async () => resolvePage2({ items: [rec(2, 'Zzz Suppe')], cursor: null }))

    await waitFor(() => screen.getByText('Zzz Suppe'))
    expect(searchSpy).toHaveBeenCalledTimes(2)
    screen.getByText('1 Rezept')
    expect(screen.queryByTestId('list-pending-skeleton')).toBeNull()
  })

  it('says "Keine Treffer" once no more pages follow', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderSearch('zzz')

    await waitFor(() => screen.getByText('Keine Treffer für die aktuellen Filter.'))
    screen.getByText('Filter zurücksetzen')
    expect(screen.queryByTestId('list-pending-skeleton')).toBeNull()
    const count = screen.getByText('0 Rezepte')
    expect(count.getAttribute('aria-hidden')).toBeNull()
    expect(count.classList.contains('invisible')).toBe(false)
  })

  it('marks the count with "+" while more pages may follow', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes'), rec(2, 'Waffles')], cursor: 2 })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()

    await waitFor(() => screen.getByText('2+ Rezepte'))
  })
})

describe('RecipeList (rows)', () => {
  const withPhoto = { ...rec(1, 'Pancakes'), mainImage: ref(3) }

  it('one photo gives every row an image cell', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [withPhoto, rec(2, 'Waffles')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()

    await waitFor(() => screen.getByText('Waffles'))
    expect(screen.getAllByTestId('recipe-thumb')).toHaveLength(2)
  })

  it("a category filter keeps the row's other category dots", async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([cat(1, [1]), cat(2, [1])])

    render(
      <MemoryRouter initialEntries={['/recipes?cat=1']}>
        <TooltipProvider>
          <RecipeList />
        </TooltipProvider>
      </MemoryRouter>,
    )

    await waitFor(() => screen.getByText('Pancakes'))
    // The filter is really applied: no Cat 2 group, whose row would list Cat 1.
    expect(screen.queryByText('Kategorien: Cat 1')).toBeNull()
    expect(screen.getByText('Kategorien: Cat 2')).toBeTruthy()
  })
})
