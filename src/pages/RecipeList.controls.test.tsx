import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './RecipeList'
import { foodly } from '../api'

const desktop = vi.hoisted(() => ({ value: true }))
vi.mock('../hooks/useIsDesktop', () => ({ useIsDesktop: () => desktop.value }))

vi.mock('../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useUser: () => undefined,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
  useCategories: () => ({ list: [], status: 'ready' }),
}))

function renderList(url = '/recipes?group=0') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TooltipProvider>
        <RecipeList />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

const searchField = () => screen.getByRole('textbox', { name: 'Rezepte suchen' })
const searchRow = () => screen.getByTestId('search-row')

beforeEach(() => {
  desktop.value = true
  // Loading forever: the controls are what's under test, and they render the same while loading.
  vi.spyOn(foodly, 'searchRecipes').mockImplementation(() => new Promise<never>(() => {}))
})

afterEach(() => vi.restoreAllMocks())

describe('RecipeList controls on desktop', () => {
  it('focuses the search when the page opens, without scrolling', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    renderList()
    // No jest-dom here, so no toHaveFocus(): compare the active element instead.
    expect(document.activeElement).toBe(searchField())
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('has the sort menu and the view toggles, but no direction button or criterion picker', () => {
    renderList()
    screen.getByRole('button', { name: /^Sortieren:/ })
    screen.getByRole('group', { name: 'Ansicht' })
    screen.getByRole('group', { name: 'Gliederung' })
    // The only button next to the search is the sort menu: no separate direction button (the toggles are radios).
    expect(
      within(searchRow())
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Sortieren: Name, A → Z'])
    expect(screen.queryByRole('button', { name: /Sortierrichtung/ })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Sortierkriterium' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sortieren & Ansicht' })).toBeNull()
  })
})

describe('RecipeList controls on the phone', () => {
  beforeEach(() => {
    desktop.value = false
  })

  it('does not focus the search', () => {
    renderList()
    expect(document.activeElement).not.toBe(searchField())
  })

  it('puts sort and view behind one button next to the search', () => {
    renderList()
    screen.getByRole('button', { name: 'Sortieren & Ansicht' })
    expect(screen.queryByRole('button', { name: /^Sortieren:/ })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Ansicht' })).toBeNull()
  })

  it('switches the list to tiles as soon as "Kacheln" is picked, sheet still open', async () => {
    renderList()
    await waitFor(() => expect(screen.getAllByTestId('row-skeleton')).toHaveLength(4))

    fireEvent.click(screen.getByRole('button', { name: 'Sortieren & Ansicht' }))
    const sheet = screen.getByRole('dialog', { name: 'Sortieren & Ansicht' })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Kacheln' }))

    // The modal sheet hides the page from role queries; test ids still reach it.
    await waitFor(() => expect(screen.getAllByTestId('tile-skeleton')).toHaveLength(4))
    expect(screen.queryAllByTestId('row-skeleton')).toHaveLength(0)
    expect(screen.getByRole('dialog', { name: 'Sortieren & Ansicht' })).toBe(sheet)
  })
})
