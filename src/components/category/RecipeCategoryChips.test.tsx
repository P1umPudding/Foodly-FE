import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeCategoryChips } from './RecipeCategoryChips'
import type { Recipe, UserCategory } from '../../api/protocol'
import type { CategoriesStatus } from '../../catalog/CatalogProvider'

const catalog = vi.hoisted(() => ({
  value: { list: [] as UserCategory[], status: 'ready' as CategoriesStatus, error: null as Error | null },
}))
vi.mock('../../catalog/CatalogProvider', () => ({
  useCategories: () => ({ ...catalog.value, retry: () => {} }),
  useCurrentUserId: () => 1,
}))
vi.mock('../../catalog/useCategoryActions', () => ({
  useCategoryActions: () => ({ create: vi.fn(), setRecipes: vi.fn() }),
}))
vi.mock('../../hooks/useIsDesktop', () => ({ useIsDesktop: () => true }))

function category(id: number, name: string, order: number, recipes: number[]): UserCategory {
  return { id, user: 1, name, recipes, order, color: '#e11d48', colorLight: null, colorDark: null }
}

const recipe = { id: 5 } as Recipe

function renderChips() {
  render(
    <MemoryRouter>
      <RecipeCategoryChips recipe={recipe} />
    </MemoryRouter>,
  )
}

afterEach(() => {
  catalog.value = { list: [], status: 'ready', error: null }
})

describe('RecipeCategoryChips', () => {
  it('links each of the recipe’s categories, by order, to its list', () => {
    catalog.value.list = [category(2, 'Zwei', 1, [5]), category(1, 'Eins', 0, [5, 6]), category(3, 'Drei', 2, [6])]
    renderChips()
    const links = screen.getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(['EEins', 'ZZwei'])
    expect(links[0].getAttribute('href')).toContain('cat=1')
    expect(links[0].hasAttribute('data-cat')).toBe(true)
    expect(screen.getByRole('button', { name: 'Kategorien ändern' }).textContent).toBe('')
  })

  it('shows neither chips nor the add text while the categories load', () => {
    catalog.value = { list: [category(1, 'Eins', 0, [5])], status: 'loading', error: null }
    renderChips()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    const plus = screen.getByRole('button', { name: 'Kategorien ändern' })
    expect(plus.textContent).toBe('')
    expect(plus.hasAttribute('disabled')).toBe(false)
  })

  it('keeps the "+" icon-only when loading the categories failed', () => {
    catalog.value = { list: [], status: 'error', error: new Error('offline') }
    renderChips()
    expect(screen.getByRole('button', { name: 'Kategorien ändern' }).textContent).toBe('')
  })
})
