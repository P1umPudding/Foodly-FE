import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './RecipeList'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import type { PaginatedRecipes, Recipe } from '../api/protocol'

function rec(id: number, name: string): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
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

// Keeps the latest observer callback, so a test decides when the sentinel scrolls into view.
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

async function scrollToEnd() {
  await act(async () => {
    intersect?.([{ isIntersecting: true } as IntersectionObserverEntry], null as unknown as IntersectionObserver)
  })
}

function deferred() {
  let resolve: (page: PaginatedRecipes) => void = () => {}
  const promise = new Promise<PaginatedRecipes>((r) => (resolve = r))
  return { promise, resolve }
}

function renderList(url = '/recipes?group=0') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TooltipProvider>
        <RecipeList />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

const FAILED = 'Weitere Rezepte konnten nicht geladen werden.'
const LOADING = 'Weitere Rezepte werden geladen …'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  intersect = null
  localStorage.clear()
})

describe('RecipeList (loading more pages)', () => {
  it('keeps the count open and offers a retry when the next page fails, without retrying by itself', async () => {
    vi.stubGlobal('IntersectionObserver', CapturingIO)
    const searchSpy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1, 'Pancakes')], cursor: 2 })
      .mockRejectedValueOnce(new Error('offline'))
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()
    await waitFor(() => screen.getByText('Pancakes'))
    await scrollToEnd()

    await waitFor(() => screen.getByText(FAILED))
    expect(screen.getByRole('alert').textContent).toContain(FAILED)
    screen.getByText('offline')
    screen.getByRole('button', { name: 'Erneut versuchen' })
    screen.getByText('1+ Rezepte')
    expect(screen.queryByTestId('list-more-skeleton')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('')

    // The sentinel is still in view: its fresh observer must not load the failed page again.
    await scrollToEnd()
    expect(searchSpy).toHaveBeenCalledTimes(2)
  })

  it('"Erneut versuchen" loads the failed page again and removes the alert', async () => {
    vi.stubGlobal('IntersectionObserver', CapturingIO)
    const retry = deferred()
    const searchSpy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1, 'Pancakes')], cursor: 2 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(retry.promise)
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()
    await waitFor(() => screen.getByText('Pancakes'))
    await scrollToEnd()
    const button = await waitFor(() => screen.getByRole('button', { name: 'Erneut versuchen' }))

    await act(async () => fireEvent.click(button))
    expect(screen.queryByText(FAILED)).toBeNull()
    screen.getByTestId('list-more-skeleton')
    expect(screen.getByRole('status').textContent).toBe(LOADING)
    // The sentinel re-subscribes while the retry runs; that must not start a second request.
    await scrollToEnd()
    expect(searchSpy).toHaveBeenCalledTimes(3)
    expect(searchSpy.mock.calls[2]?.[1]).toBe(2)

    await act(async () => retry.resolve({ items: [rec(2, 'Waffles')], cursor: null }))
    await waitFor(() => screen.getByText('Waffles'))
    expect(screen.queryByText(FAILED)).toBeNull()
    screen.getByText('2 Rezepte')
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('a failed retry brings the alert back', async () => {
    vi.stubGlobal('IntersectionObserver', CapturingIO)
    const searchSpy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1, 'Pancakes')], cursor: 2 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('still offline'))
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()
    await waitFor(() => screen.getByText('Pancakes'))
    await scrollToEnd()
    const button = await waitFor(() => screen.getByRole('button', { name: 'Erneut versuchen' }))
    await act(async () => fireEvent.click(button))

    await waitFor(() => screen.getByText('still offline'))
    screen.getByText(FAILED)
    screen.getByRole('button', { name: 'Erneut versuchen' })
    screen.getByText('1+ Rezepte')
    expect(searchSpy).toHaveBeenCalledTimes(3)
  })

  it('announces loading more in the status region while the next page loads', async () => {
    vi.stubGlobal('IntersectionObserver', CapturingIO)
    const page2 = deferred()
    vi.spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1, 'Pancakes')], cursor: 2 })
      .mockReturnValueOnce(page2.promise)
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList()
    await waitFor(() => screen.getByText('Pancakes'))
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('')
    expect(status.getAttribute('aria-live')).toBe('polite')

    await scrollToEnd()
    expect(screen.getByRole('status').textContent).toBe(LOADING)

    await act(async () => page2.resolve({ items: [rec(2, 'Waffles')], cursor: null }))
    await waitFor(() => screen.getByText('Waffles'))
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('with no visible row: the failure replaces the pending skeleton and paging stops', async () => {
    vi.stubGlobal('IntersectionObserver', FiringIO)
    const searchSpy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1, 'Pancakes')], cursor: 2 })
      .mockRejectedValueOnce(new Error('offline'))
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList('/recipes?group=0&q=zzz')

    await waitFor(() => screen.getByText(FAILED))
    expect(screen.queryByTestId('list-pending-skeleton')).toBeNull()
    expect(screen.queryByText('Keine Treffer für die aktuellen Filter.')).toBeNull()
    expect(screen.queryByText('Noch keine Rezepte.')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('')
    // Give a looping sentinel the chance to fire again.
    await act(async () => new Promise((r) => setTimeout(r, 20)))
    expect(searchSpy).toHaveBeenCalledTimes(2)
  })

  it('with no visible row: announces loading while pages are still searched', async () => {
    vi.stubGlobal('IntersectionObserver', CapturingIO)
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: 2 })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    renderList('/recipes?group=0&q=zzz')

    await waitFor(() => screen.getByTestId('list-pending-skeleton'))
    expect(screen.getByRole('status').textContent).toBe(LOADING)
  })
})
