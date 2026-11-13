import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, useNavigate } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './RecipeList'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { SHELL_NAV_STATE } from '../components/shell/nav'
import type { PaginatedRecipes, Recipe } from '../api/protocol'

function rec(id: number): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    name: `Rezept ${id}`,
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

vi.mock('../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useUser: () => undefined,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
  useCategories: () => {
    const req = useRequest(() => foodly.listCategories(), [])
    return { list: req.data ?? [], status: req.status }
  },
}))

function deferred() {
  let resolve: (page: PaginatedRecipes) => void = () => {}
  let reject: (e: Error) => void = () => {}
  const promise = new Promise<PaginatedRecipes>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// One page of ten recipes; page n holds ids 10n-9 … 10n.
function page(n: number, cursor: number | null): PaginatedRecipes {
  return { items: Array.from({ length: 10 }, (_, i) => rec(10 * (n - 1) + i + 1)), cursor }
}

// jsdom has no layout: the page height follows the rendered recipe rows (100 px each), so the restore measures
// what is on screen after a page has rendered. jsdom's innerHeight is 768, so page 1 reaches 1000 − 768 = 232.
const ROW_PX = 100
function renderedRows() {
  const hrefs = Array.from(document.querySelectorAll('a[href^="/recipes/"]'), (a) => a.getAttribute('href'))
  return new Set(hrefs).size
}

let navigate: (to: string) => void = () => {}
function Navigator() {
  const nav = useNavigate()
  navigate = (to) => nav(to)
  return null
}

function renderList(url = '/recipes?group=0') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TooltipProvider>
        <Navigator />
        {/* The same URL as the list: React Router replaces the entry (new key, not POP), like a tab-bar tap. */}
        <Link to="/recipes?group=0" state={SHELL_NAV_STATE}>
          shell link
        </Link>
        <RecipeList />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

function savePosition(y: number, list = 'group=0') {
  sessionStorage.setItem('recipeList:scroll', JSON.stringify({ list, y }))
}

const FAILED = 'Weitere Rezepte konnten nicht geladen werden.'

beforeEach(() => {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    get: () => renderedRows() * ROW_PX,
  })
  vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
})

afterEach(() => {
  delete (document.documentElement as { scrollHeight?: number }).scrollHeight
  vi.restoreAllMocks()
  sessionStorage.clear()
  localStorage.clear()
})

describe('RecipeList (scroll restore beyond the first page)', () => {
  it('loads the next page first when the saved position lies beyond it, then scrolls to it', async () => {
    const page2 = deferred()
    const search = vi
      .spyOn(foodly, 'searchRecipes')
      .mockImplementation((_q, n) => (n === 1 ? Promise.resolve(page(1, 2)) : page2.promise))
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    savePosition(900)

    renderList()
    await waitFor(() => expect(search).toHaveBeenCalledWith(expect.anything(), 2))
    expect(scrollTo).not.toHaveBeenCalled()
    // Scroll events while the restore runs come from the clamped short page and are not recorded.
    window.dispatchEvent(new Event('scroll'))
    expect(JSON.parse(sessionStorage.getItem('recipeList:scroll') ?? 'null')).toEqual({ list: 'group=0', y: 900 })

    // More pages follow, but page 2 makes 900 reachable (20 rows → 2000 − 768 = 1232).
    await act(async () => page2.resolve(page(2, 3)))
    await waitFor(() => screen.getByText('Rezept 20'))
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith(0, 900)
    expect(search).toHaveBeenCalledTimes(2)
  })

  // jsdom does not clamp scrollTo: the browser takes the position to the list end (checked by hand).
  it('scrolls to the saved position at the end of a fully loaded list, not to the top', async () => {
    const search = vi.spyOn(foodly, 'searchRecipes').mockResolvedValue(page(1, null))
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    savePosition(5000)

    renderList()
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 5000))
    expect(scrollTo).not.toHaveBeenCalledWith(0, 0)
    expect(search).toHaveBeenCalledTimes(1)
  })

  it('scrolls as far as it can and shows the error when the next page fails', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockImplementation((_q, n) =>
      n === 1 ? Promise.resolve(page(1, 2)) : Promise.reject(new Error('offline')),
    )
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    savePosition(900)

    renderList()
    await waitFor(() => screen.getByText(FAILED))
    expect(scrollTo).toHaveBeenCalledWith(0, 900)
    screen.getByRole('button', { name: 'Erneut versuchen' })
  })

  it('stops loading after ten pages and scrolls as far as it can', async () => {
    const search = vi.spyOn(foodly, 'searchRecipes').mockImplementation((_q, n) => Promise.resolve(page(n, n + 1)))
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    savePosition(1e6)

    renderList()
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 1e6))
    expect(search).toHaveBeenCalledTimes(11)
    expect(search).toHaveBeenLastCalledWith(expect.anything(), 11)
  })

  it('ends the restore without scrolling when another list opens while a page loads', async () => {
    const page2 = deferred()
    const search = vi
      .spyOn(foodly, 'searchRecipes')
      .mockImplementation((q, n) =>
        q.sort?.order === 'desc'
          ? Promise.resolve({ items: [rec(101)], cursor: null })
          : n === 1
            ? Promise.resolve(page(1, 2))
            : page2.promise,
      )
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    savePosition(900)

    renderList()
    await waitFor(() => expect(search).toHaveBeenCalledWith(expect.anything(), 2))
    act(() => navigate('/recipes?group=0&dir=desc'))
    await waitFor(() => screen.getByText('Rezept 101'))
    await act(async () => page2.resolve(page(2, 3)))
    expect(scrollTo).not.toHaveBeenCalledWith(0, 900)
  })

  // The free-text search filters on the client: the query stays, the list stays ready, only its identity changes.
  it('ends the restore without scrolling when the search changes while a page loads', async () => {
    const page2 = deferred()
    const search = vi
      .spyOn(foodly, 'searchRecipes')
      .mockImplementation((_q, n) => (n === 1 ? Promise.resolve(page(1, 2)) : page2.promise))
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    savePosition(900)

    renderList()
    await waitFor(() => expect(search).toHaveBeenCalledWith(expect.anything(), 2))
    act(() => navigate('/recipes?group=0&q=Rezept'))
    await act(async () => page2.resolve(page(2, 3)))
    await waitFor(() => screen.getByText('Rezept 20'))
    expect(scrollTo).not.toHaveBeenCalledWith(0, 900)
    expect(search).toHaveBeenCalledTimes(2)
  })

  it('keeps the list at the top when a shell nav tap ends the restore', async () => {
    const page2 = deferred()
    const search = vi
      .spyOn(foodly, 'searchRecipes')
      .mockImplementation((_q, n) => (n === 1 ? Promise.resolve(page(1, 2)) : page2.promise))
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    savePosition(900)

    renderList()
    await waitFor(() => expect(search).toHaveBeenCalledWith(expect.anything(), 2))
    fireEvent.click(screen.getByText('shell link'))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    await act(async () => page2.resolve(page(2, null)))
    await waitFor(() => screen.getByText('Rezept 20'))
    expect(scrollTo).not.toHaveBeenCalledWith(0, 900)
  })
})
