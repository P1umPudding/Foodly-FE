import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TooltipProvider } from '@postxl/ui-components'
import { FilterControls } from './FilterControls'
import { DEFAULT_STATE, type ListState } from '../../list/state'
import type { Ingredient, Tag, UserCategory } from '../../api/protocol'

const cats: UserCategory[] = [
  { id: 1, user: 1, name: 'Favoriten', recipes: [10], order: 0, color: '#e11d48', colorLight: null, colorDark: null },
]

function renderControls(
  state: ListState,
  props: Partial<{ tags: Tag[]; ingredients: Ingredient[]; categoriesLoading: boolean }> = {},
) {
  const set = vi.fn()
  render(
    <TooltipProvider>
      <FilterControls
        state={state}
        set={set}
        categories={cats}
        onToggleCategory={() => {}}
        uncategorizedCount={0}
        tags={[]}
        ingredients={[]}
        {...props}
      />
    </TooltipProvider>,
  )
  return { set }
}

const heading = (name: string) => screen.queryByRole('heading', { name: new RegExp(`^${name}`) })

describe('FilterControls', () => {
  it('shows Tags and Zutaten only when there are any', () => {
    renderControls(DEFAULT_STATE)
    for (const name of ['Kategorien', 'Arbeitszeit', 'Zugriff']) expect(heading(name)).not.toBeNull()
    expect(heading('Tags')).toBeNull()
    expect(heading('Zutaten')).toBeNull()
  })

  it('renders every filter content', () => {
    renderControls(DEFAULT_STATE, {
      tags: [{ id: 'vegan', svg: null } as Tag],
      ingredients: [{ id: 1, name: 'Mehl' }],
    })
    expect(heading('Tags')).not.toBeNull()
    expect(heading('Zutaten')).not.toBeNull()
    expect(screen.getByRole('checkbox', { name: 'vegan' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Mehl' })).toBeTruthy()
    expect(screen.getByRole('slider')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Meine Rolle' })).toBeTruthy()
  })

  it('offers "Ohne Kategorie" regardless of uncategorizedCount', () => {
    renderControls(DEFAULT_STATE)
    expect(screen.getByRole('checkbox', { name: /Ohne Kategorie/ })).toBeTruthy()
  })

  it('selects a category through set', () => {
    const { set } = renderControls(DEFAULT_STATE)
    fireEvent.click(screen.getByRole('checkbox', { name: /Favoriten/ }))
    expect(set).toHaveBeenCalledWith({ categories: [1] })
  })

  it('clears the categories from the group heading', () => {
    const { set } = renderControls({ ...DEFAULT_STATE, categories: [1] })
    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    expect(set).toHaveBeenCalledWith({ categories: [] })
  })

  it('shows a skeleton instead of the categories while they load', () => {
    renderControls(DEFAULT_STATE, { categoriesLoading: true })
    expect(screen.queryByRole('checkbox', { name: /Favoriten/ })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: /Ohne Kategorie/ })).toBeNull()
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(4)
  })
})
