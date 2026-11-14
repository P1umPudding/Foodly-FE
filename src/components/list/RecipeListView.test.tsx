import type { ComponentProps } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { RecipeListView } from './RecipeListView'
import { categoryColors } from '../../lib/categoryColor'
import type { Recipe, UserCategory } from '../../api/protocol'
import { ref } from '../../test/images'

vi.mock('../../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useUser: () => undefined,
  useTags: () => ({ byId: {} }),
}))

const base: Recipe = {
  id: 0,
  owner: 1,
  editors: [],
  viewers: [],
  createdAt: null,
  updatedAt: null,
  myAccessSince: null,
  name: '',
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
const recipes: Recipe[] = [
  { ...base, id: 1, name: 'In Both' },
  { ...base, id: 2, name: 'Loner' },
]
const cats: UserCategory[] = [
  { id: 10, user: 1, name: 'Fav', recipes: [1], order: 0, color: '#e11d48', colorLight: null, colorDark: null },
  { id: 11, user: 1, name: 'Quick', recipes: [1], order: 1, color: '#000', colorLight: null, colorDark: null },
]

it('by-category shows a recipe under each of its categories + Ohne Kategorie bucket', () => {
  render(
    <TooltipProvider>
      <MemoryRouter>
        <RecipeListView recipes={recipes} categories={cats} detail="detailed" />
      </MemoryRouter>
    </TooltipProvider>,
  )
  expect(screen.getByText('Fav')).toBeTruthy()
  expect(screen.getByText('Quick')).toBeTruthy()
  expect(screen.getByText('Ohne Kategorie')).toBeTruthy()
  expect(screen.getAllByText('In Both').length).toBe(2) // appears in both categories
  expect(screen.getAllByText('Loner').length).toBe(1) // only in the bucket
})

it('renders a collapsible, colour-coded heading per category', () => {
  render(
    <TooltipProvider>
      <MemoryRouter>
        <RecipeListView recipes={recipes} categories={cats} detail="detailed" />
      </MemoryRouter>
    </TooltipProvider>,
  )
  const heading = screen.getByRole('button', { name: /Fav/i }) // CollapseTrigger is a button
  // Neutral name next to a colour dot; the category colour is never the text colour.
  const name = within(heading).getByTestId('group-name')
  expect(name.className).toContain('text-foreground')
  expect(name.className).not.toContain('text-cat-ink')
  expect(heading.className).not.toContain('text-cat-ink')
  expect(within(heading).getByTestId('group-dot').className).toContain('bg-cat-dot')
  // Collapsed (designer review 13.11.): name muted, weight 500.
  expect(name.className).toContain('group-data-[state=closed]/cat:text-muted-foreground')
  expect(name.className).toContain('group-data-[state=closed]/cat:font-medium')
  // The Collapse root carries the colour variables; the bridge CSS isn't loaded in
  // jsdom, so only the variables are checked, not computed colours.
  const group = heading.closest('[data-cat]') as HTMLElement
  expect(group).not.toBeNull()
  expect(group.style.getPropertyValue('--cat-ink-l')).toBe(categoryColors(cats[0]).light.ink)
  expect(group.querySelector('.border-cat-dot')).not.toBeNull()
  const none = screen.getByRole('button', { name: /Ohne Kategorie/i })
  expect(none.closest('[data-cat]')).toBeNull()
  // "Ohne Kategorie": no dot, grey line.
  expect(within(none).queryByTestId('group-dot')).toBeNull()
  const noneGroup = none.closest('.group\\/cat') as HTMLElement
  expect(noneGroup.querySelector('.border-border')).not.toBeNull()
  expect(noneGroup.querySelector('.border-cat-dot')).toBeNull()
})

it('flat list (grouped=false): no category headers, every recipe once', () => {
  render(
    <TooltipProvider>
      <MemoryRouter>
        <RecipeListView recipes={recipes} categories={cats} detail="detailed" grouped={false} />
      </MemoryRouter>
    </TooltipProvider>,
  )
  expect(screen.queryByText('Fav')).toBeNull()
  expect(screen.queryByText('Ohne Kategorie')).toBeNull()
  expect(screen.getAllByText('In Both').length).toBe(1) // no longer duplicated across categories
  expect(screen.getAllByText('Loner').length).toBe(1)
})

function renderView(props: Partial<ComponentProps<typeof RecipeListView>> = {}) {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <RecipeListView recipes={recipes} categories={cats} detail="detailed" {...props} />
      </MemoryRouter>
    </TooltipProvider>,
  )
}

// The row link of a recipe inside the group headed by `group`.
function rowIn(group: RegExp, name: string) {
  const groupRoot = screen.getByRole('button', { name: group }).closest('.group\\/cat') as HTMLElement
  return within(groupRoot).getByRole('link', { name: new RegExp(name) })
}

describe('category dots', () => {
  it('a row inside a category group shows only the other categories', () => {
    renderView()
    expect(within(rowIn(/Fav/, 'In Both')).getByText('Kategorien: Quick')).toBeTruthy()
    expect(within(rowIn(/Quick/, 'In Both')).getByText('Kategorien: Fav')).toBeTruthy()
  })

  it('a filter narrowing the groups still leaves the other dots', () => {
    renderView({ categories: [cats[0]], allCategories: cats })
    expect(screen.queryByRole('button', { name: /Quick/ })).toBeNull()
    expect(within(rowIn(/Fav/, 'In Both')).getByText('Kategorien: Quick')).toBeTruthy()
  })

  it('the flat list shows all categories', () => {
    renderView({ grouped: false })
    expect(screen.getByText('Kategorien: Fav, Quick')).toBeTruthy()
  })
})

describe('image column', () => {
  const withPhoto = [{ ...recipes[0], mainImage: ref(3) }, recipes[1]]

  it('without showImages no row has an image cell', () => {
    renderView({ recipes: withPhoto, grouped: false })
    expect(screen.queryAllByTestId('recipe-thumb')).toHaveLength(0)
  })

  it('with showImages every row has a 48 px cell, rows without photo the placeholder', () => {
    const { container } = renderView({ recipes: withPhoto, grouped: false, showImages: true })
    const thumbs = screen.getAllByTestId('recipe-thumb')
    expect(thumbs).toHaveLength(2)
    for (const t of thumbs) expect(t.className).toMatch(/\bh-12 w-12\b/)
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(thumbs[1].querySelector('.lucide-utensils-crossed')).toBeTruthy()
  })
})

describe('tiles view', () => {
  it('grouped: category headers, each group a grid of tiles', () => {
    renderView({ detail: 'tiles' })
    expect(screen.getByRole('button', { name: /Fav/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ohne Kategorie/ })).toBeTruthy()
    // Ohne Kategorie, Fav, Quick — one grid each, under its group header.
    const grids = screen.getAllByTestId('tile-grid')
    expect(grids).toHaveLength(3)
    expect(
      within(screen.getByRole('button', { name: /Fav/ }).closest('.group\\/cat') as HTMLElement).getByTestId(
        'tile-grid',
      ),
    ).toBeTruthy()
    expect(screen.getAllByTestId('tile-type-name').map((t) => t.textContent)).toEqual(['Loner', 'In Both', 'In Both'])
  })

  it('a tile inside group X leaves out the dot of X', () => {
    renderView({ detail: 'tiles' })
    const tile = rowIn(/Fav/, 'In Both')
    expect(within(tile).getByText('Kategorien: Quick')).toBeTruthy()
    expect(within(tile).getAllByTestId('category-dot')).toHaveLength(1)
  })

  it('a collapsed group hides its tiles but keeps its header', () => {
    renderView({ detail: 'tiles', collapsed: new Set(['cat-10']) })
    const fav = screen.getByRole('button', { name: /Fav/ }).closest('.group\\/cat') as HTMLElement
    expect(within(fav).queryByRole('link', { name: /In Both/ })).toBeNull()
    expect(rowIn(/Quick/, 'In Both')).toBeTruthy()
  })

  it('clicking a group header collapses it, as with rows', () => {
    const onCollapsedChange = vi.fn()
    renderView({ detail: 'tiles', onCollapsedChange })
    fireEvent.click(screen.getByRole('button', { name: /Fav/ }))
    expect(onCollapsedChange).toHaveBeenCalledWith(new Set(['cat-10']))
  })

  it('flat: one grid, no headers', () => {
    renderView({ detail: 'tiles', grouped: false })
    expect(screen.queryByRole('button', { name: /Fav/ })).toBeNull()
    expect(screen.getAllByTestId('tile-grid')).toHaveLength(1)
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })
})

it('flat list drops only the excepted category from the rows', () => {
  render(
    <TooltipProvider>
      <MemoryRouter>
        <RecipeListView recipes={recipes} categories={cats} detail="detailed" grouped={false} exceptCategoryId={10} />
      </MemoryRouter>
    </TooltipProvider>,
  )
  expect(screen.getByText('Kategorien: Quick')).toBeTruthy()
  expect(screen.queryByText(/Kategorien:.*Fav/)).toBeNull()
})

describe('"Öffnen ›" in the group header', () => {
  it('leads to the category page, but not for "Ohne Kategorie"', () => {
    renderView()
    expect(screen.getByRole('link', { name: 'Öffnen: „Fav“' }).getAttribute('href')).toBe('/categories/10')
    expect(screen.getByRole('link', { name: 'Öffnen: „Quick“' }).getAttribute('href')).toBe('/categories/11')
    expect(screen.queryByRole('link', { name: 'Öffnen: „Ohne Kategorie“' })).toBeNull()
    expect(screen.getAllByText('Öffnen ›')).toHaveLength(2)
  })

  it('does not fold the group when clicked', () => {
    const onCollapsedChange = vi.fn()
    renderView({ onCollapsedChange })
    fireEvent.click(screen.getByRole('link', { name: 'Öffnen: „Fav“' }))
    expect(onCollapsedChange).not.toHaveBeenCalled()
  })
})

describe('tile grid width', () => {
  it('the list grid is the dense one (190 px), elsewhere 230 px', () => {
    const { unmount } = renderView({ detail: 'tiles', grouped: false, denseTiles: true })
    expect(screen.getByTestId('tile-grid').className).toContain('minmax(190px,1fr)')
    unmount()
    renderView({ detail: 'tiles', grouped: false })
    expect(screen.getByTestId('tile-grid').className).toContain('minmax(230px,1fr)')
  })
})

it('"Öffnen" hides until hover on desktop but always shows on phones and touch', () => {
  renderView()
  const open = screen.getByRole('link', { name: 'Öffnen: „Fav“' })
  expect(open.className).toContain('opacity-0')
  // Shown on head hover and on keyboard focus anywhere in the head (also the trigger; not after a mouse click), always on phones/touch.
  for (const v of ['group-hover/head', 'group-has-[:focus-visible]/head', 'phone', 'touch']) {
    expect(open.className).toContain(`${v}:opacity-100`)
  }
})
