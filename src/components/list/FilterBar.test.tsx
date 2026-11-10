import { useState, type ReactElement } from 'react'
import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { FilterBar } from './FilterBar'
import { DEFAULT_STATE, type ListState } from '../../list/state'
import type { Ingredient, Tag, UserCategory } from '../../api/protocol'

// The Zugriff content carries tooltips; the app provides them once at the root.
const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>)

const desktop = vi.hoisted(() => ({ value: true }))
vi.mock('../../hooks/useIsDesktop', () => ({ useIsDesktop: () => desktop.value }))

beforeEach(() => {
  desktop.value = true
})

const cats: UserCategory[] = [
  { id: 1, user: 1, name: 'Favoriten', recipes: [10], order: 0, color: '#e11d48', colorLight: null, colorDark: null },
]
const tags = [{ id: 'vegan', svg: null } as Tag, { id: 'scharf', svg: null } as Tag]
const mehl: Ingredient = { id: 1, name: 'Mehl' }

type Props = Partial<{
  categoriesStatus: 'loading' | 'ready' | 'error'
  tags: Tag[]
  ingredients: Ingredient[]
  labelIngredients: Ingredient[]
}>

function renderBar(state: ListState, props: Props = {}) {
  const set = vi.fn()
  render(
    <FilterBar state={state} set={set} categories={cats} tags={[]} ingredients={[]} labelIngredients={[]} {...props} />,
  )
  return { set }
}

// Holds the state like useListState does, so a pick shows up on the button.
function StatefulBar({ initial, ...props }: Props & { initial: ListState }) {
  const [state, setState] = useState(initial)
  return (
    <FilterBar
      state={state}
      set={(patch) => setState((s) => ({ ...s, ...patch }))}
      categories={cats}
      tags={[]}
      ingredients={[]}
      labelIngredients={[]}
      {...props}
    />
  )
}

const bar = () => screen.getByRole('group', { name: 'Filter' })

describe('FilterBar', () => {
  it('always shows the five filter buttons, also without tags or ingredients', () => {
    renderBar(DEFAULT_STATE)
    for (const name of ['Kategorie', 'Tags', 'Zutaten', 'Arbeitszeit', 'Zugriff']) {
      expect(within(bar()).getByRole('button', { name })).toBeTruthy()
    }
  })

  it('says so in the popover when there are no tags or ingredients', () => {
    renderBar(DEFAULT_STATE)
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }))
    expect(screen.getByText('Keine Tags')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Tags' }), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Zutaten' }))
    expect(screen.getByText('Keine Zutaten')).toBeTruthy()
  })

  it('shows skeletons instead of the categories while they load', () => {
    renderBar(DEFAULT_STATE, { categoriesStatus: 'loading' })
    fireEvent.click(screen.getByRole('button', { name: 'Kategorie' }))
    const popover = screen.getByRole('dialog', { name: 'Kategorie' })
    expect(within(popover).queryByRole('checkbox', { name: /Ohne Kategorie/ })).toBeNull()
    expect(within(popover).getByTestId('category-skeleton').children).toHaveLength(4)
  })

  it('shows no category id on the button while the categories load', () => {
    renderBar({ ...DEFAULT_STATE, categories: [3] }, { categoriesStatus: 'loading' })
    expect(within(bar()).getByRole('button', { name: 'Kategorie: …' })).toBeTruthy()
  })

  it('names "Ohne Kategorie" while the categories load', () => {
    renderBar({ ...DEFAULT_STATE, categories: [0] }, { categoriesStatus: 'loading' })
    expect(within(bar()).getByRole('button', { name: 'Kategorie: Ohne Kategorie' })).toBeTruthy()
  })

  it('offers no selection in the popover when the categories failed to load', () => {
    renderBar(DEFAULT_STATE, { categoriesStatus: 'error' })
    fireEvent.click(within(bar()).getByRole('button', { name: 'Kategorie' }))
    const popover = screen.getByRole('dialog', { name: 'Kategorie' })
    expect(within(popover).getByText('Kategorien nicht verfügbar')).toBeTruthy()
    expect(within(popover).queryByRole('checkbox')).toBeNull()
  })

  it('opens a filter as a bottom sheet on phones', () => {
    desktop.value = false
    renderBar(DEFAULT_STATE, { tags })
    fireEvent.click(within(bar()).getByRole('button', { name: 'Tags' }))
    const sheet = screen.getByRole('dialog', { name: 'Tags' })
    expect(within(sheet).getByRole('checkbox', { name: 'vegan' })).toBeTruthy()
    expect(within(sheet).getByRole('button', { name: 'Anzeigen' })).toBeTruthy()
  })

  it.each<[string, string, string | RegExp]>([
    ['Kategorie', 'checkbox', /Ohne Kategorie/],
    ['Tags', 'checkbox', 'vegan'],
    ['Zutaten', 'checkbox', 'Mehl'],
    ['Arbeitszeit', 'radio', '≤ 30 Minuten'],
    ['Zugriff', 'radiogroup', 'Meine Rolle'],
  ])('opens %s with its filter content', (label, role, name) => {
    renderBar(DEFAULT_STATE, { tags, ingredients: [mehl], labelIngredients: [mehl] })
    fireEvent.click(within(bar()).getByRole('button', { name: label }))
    const dialog = screen.getByRole('dialog', { name: label })
    expect(within(dialog).getByRole(role as 'checkbox', { name })).toBeTruthy()
  })

  it('shows the picked tag on the button; its ✕ removes only that filter', () => {
    render(<StatefulBar initial={{ ...DEFAULT_STATE, durationMax: 30 }} tags={tags} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }))
    // The popover is portalled to <body>, outside the bar.
    fireEvent.click(screen.getByRole('checkbox', { name: 'vegan' }))
    expect(within(bar()).getByRole('button', { name: 'Tags: vegan' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tags entfernen' }))
    expect(within(bar()).getByRole('button', { name: 'Tags' })).toBeTruthy()
    expect(within(bar()).getByRole('button', { name: 'Arbeitszeit: ≤ 30 min' })).toBeTruthy()
  })

  it('names a selected ingredient from the full catalog, even when no loaded recipe uses it', () => {
    renderBar({ ...DEFAULT_STATE, ingredients: [1] }, { ingredients: [], labelIngredients: [mehl] })
    expect(within(bar()).getByRole('button', { name: 'Zutaten: Mehl' })).toBeTruthy()
  })

  it.each<[string, Partial<ListState>, Partial<ListState>]>([
    ['Kategorie', { categories: [1] }, { categories: [] }],
    ['Tags', { tags: ['vegan'] }, { tags: [] }],
    ['Zutaten', { ingredients: [1] }, { ingredients: [] }],
    ['Arbeitszeit', { durationMax: 30 }, { durationMax: null }],
    ['Zugriff', { role: 'editor', collab: 'shared' }, { role: 'any', collab: 'any' }],
  ])('the ✕ of %s resets just that filter', (label, active, cleared) => {
    const { set } = renderBar({ ...DEFAULT_STATE, ...active }, { labelIngredients: [mehl] })
    fireEvent.click(screen.getByRole('button', { name: `${label} entfernen` }))
    expect(set).toHaveBeenCalledWith(cleared)
  })
})
