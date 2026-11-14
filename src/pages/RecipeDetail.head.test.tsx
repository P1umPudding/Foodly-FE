import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import { TimerProvider } from '../timers/TimerProvider'
import type { Recipe, User } from '../api/protocol'
import { ref } from '../test/images'

// The category row has its own tests (RecipeDetail.categories); here it would only need more catalog mocks.
vi.mock('../components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))

const names: Record<number, string> = { 1: 'Ich', 2: 'Mara', 3: 'Jonas' }
const session = vi.hoisted(() => ({ me: 1 as number | null }))
vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => session.me,
  useUsers: (ids: number[]): User[] =>
    ids.filter((id) => names[id]).map((id) => ({ id, name: names[id], profilePicture: null })),
}))

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    rating: [],
    name: 'Pancakes',
    tags: [],
    source: null,
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: 4,
    sizeText: 'Portionen',
    notes: [],
    mainImage: null,
    images: [],
    sections: [
      {
        id: 1,
        name: null,
        steps: ['Rühren'],
        ingredients: [{ id: 11, ingredient: null, text: 'Mehl', amount: '200', amountPrefix: null, unit: 'g' }],
      },
    ],
    ...over,
  }
}

function LocationProbe() {
  const location = useLocation()
  const type = useNavigationType()
  return <div data-testid="location">{`${location.pathname}${location.search} ${type}`}</div>
}

function renderDetail(entry: string, recipes: Record<number, Recipe>) {
  vi.spyOn(foodly, 'getRecipe').mockImplementation(async (id) => {
    const found = recipes[id]
    if (!found) throw new Error(`recipe ${id} not found`)
    return found
  })
  return render(
    <TooltipProvider>
      <TimerProvider userId={1}>
        <MemoryRouter initialEntries={[entry]}>
          <Link to="/recipes/6">test-open-6</Link>
          <Routes>
            <Route path="/recipes/:id" element={<RecipeDetail />} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </TimerProvider>
    </TooltipProvider>,
  )
}

const location = () => screen.getByTestId('location').textContent
const heading = () => screen.findByRole('heading', { name: /Pancakes|Waffeln/ })
const classesOf = (el: Element) => el.className.split(/\s+/)
const header = () => document.querySelector<HTMLElement>('article > header')!

afterEach(() => {
  vi.restoreAllMocks()
  session.me = 1
})

describe('RecipeDetail head layout', () => {
  it('with a photo: stacked below 1100 px, two columns from there, hero opens the lightbox at image 1', async () => {
    Element.prototype.scrollTo ??= vi.fn()
    renderDetail('/recipes/5', { 5: recipe({ mainImage: ref(3), images: [ref(4)] }) })
    await heading()

    const classes = classesOf(header())
    expect(classes).toEqual(expect.arrayContaining(['grid', 'min-[1100px]:grid-cols-2']))
    expect(classes.some((c) => c.startsWith('grid-cols-'))).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Foto groß ansehen' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/1\s*\/\s*2/)).toBeTruthy()
  })

  it('gallery tiles open the lightbox at their own image, the main image included', async () => {
    Element.prototype.scrollTo ??= vi.fn()
    renderDetail('/recipes/5', { 5: recipe({ mainImage: ref(3), images: [ref(4), ref(5)] }) })
    await heading()

    fireEvent.click(screen.getByRole('button', { name: 'Foto 3 groß ansehen' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/3\s*\/\s*3/)).toBeTruthy()
  })

  it('the gallery sits below the sections and above the source', async () => {
    renderDetail('/recipes/5', { 5: recipe({ mainImage: ref(3), images: [ref(4)], source: 'Oma' }) })
    await heading()

    const fotos = screen.getByRole('heading', { name: 'Fotos' })
    const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(follows(screen.getByText('Zutaten'), fotos)).toBe(true)
    expect(follows(fotos, screen.getByText(/Quelle:/))).toBe(true)
  })

  it('a single image is only the hero: no gallery', async () => {
    renderDetail('/recipes/5', { 5: recipe({ mainImage: ref(3) }) })
    await heading()

    expect(screen.queryByRole('heading', { name: 'Fotos' })).toBeNull()
  })

  it('without a photo: no image, no placeholder, no gallery, a narrower head and a larger title', async () => {
    const { container } = renderDetail('/recipes/5', { 5: recipe() })
    const title = await heading()

    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByTestId('image-fallback')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Foto groß ansehen' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Fotos' })).toBeNull()
    expect(classesOf(header())).toContain('max-w-[720px]')
    expect(classesOf(title)).toContain('text-[32px]')
  })

  it('with a photo the title uses the 26 px token', async () => {
    renderDetail('/recipes/5', { 5: recipe({ mainImage: ref(3) }) })
    expect(classesOf(await heading())).toContain('text-2xl')
  })

  it('shows notes as a plain list and leaves out empty parts', async () => {
    renderDetail('/recipes/5', { 5: recipe({ notes: ['Warm servieren', 'Mit Sirup'] }) })
    await heading()

    const list = within(header()).getByRole('list')
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Warm servieren', 'Mit Sirup'])
    expect(list.querySelector('svg')).toBeNull()
    // No time and no other people: neither part leaves an empty element behind.
    expect(screen.queryByText(/^(von|mit)/)).toBeNull()
  })

  it('shows all tags as chips in the head', async () => {
    renderDetail('/recipes/5', { 5: recipe({ tags: ['Vegan', 'Scharf', 'Schnell'] }) })
    await screen.findByRole('heading', { level: 1, name: 'Pancakes' })
    for (const tag of ['Vegan', 'Scharf', 'Schnell'])
      expect(screen.getByText(tag).parentElement!.className).toContain('bg-tag')
  })

  it('has no inline styles in the head', async () => {
    renderDetail('/recipes/5', { 5: recipe({ mainImage: ref(3), notes: ['x'], time: '20 Min.' }) })
    await heading()
    expect(header().querySelector('[style]')).toBeNull()
  })
})

describe('RecipeDetail origin', () => {
  it('names the owner of someone else’s recipe', async () => {
    renderDetail('/recipes/5', { 5: recipe({ owner: 2, viewers: [1] }) })
    await heading()
    expect(screen.getByText('von Mara')).toBeTruthy()
  })

  it('leaves the origin out while the current user is still unknown', async () => {
    session.me = null
    renderDetail('/recipes/5', { 5: recipe({ owner: 1, editors: [2] }) })
    await heading()
    expect(screen.queryByText(/^(von|mit) /)).toBeNull()
  })

  it('leaves the origin out while no name is known', async () => {
    renderDetail('/recipes/5', { 5: recipe({ owner: 7, viewers: [1] }) })
    await heading()
    expect(screen.queryByText(/^von/)).toBeNull()
  })

  it('names the editors of my own recipe', async () => {
    renderDetail('/recipes/5', { 5: recipe({ editors: [2, 3] }) })
    await heading()
    expect(screen.getByText('mit Mara, Jonas')).toBeTruthy()
  })
})

describe('RecipeDetail „Kochen“', () => {
  it('is left out for a recipe without steps', async () => {
    renderDetail('/recipes/5', {
      5: recipe({ sections: [{ id: 1, name: null, steps: [], ingredients: [] }] }),
    })
    await heading()
    expect(screen.queryByRole('link', { name: /Kochen/ })).toBeNull()
  })

  it('links to the cook mode with the servings', async () => {
    renderDetail('/recipes/5', { 5: recipe() })
    await heading()
    expect(screen.getByRole('link', { name: /Kochen/ }).getAttribute('href')).toBe('/recipes/5/cook?servings=4')

    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }))
    expect(screen.getByRole('link', { name: /Kochen/ }).getAttribute('href')).toBe('/recipes/5/cook?servings=5')
  })

  it('carries the factor of a fixed-size recipe', async () => {
    renderDetail('/recipes/5?factor=1.5', { 5: recipe({ sizeNumber: null, sizeText: '26 cm Springform' }) })
    await heading()
    expect(screen.getByRole('link', { name: /Kochen/ }).getAttribute('href')).toBe('/recipes/5/cook?factor=1.5')
    expect(screen.getByText('300 g')).toBeTruthy()
  })
})

describe('RecipeDetail size in the URL', () => {
  it('the stepper writes ?servings with replace', async () => {
    renderDetail('/recipes/5?q=x', { 5: recipe() })
    await heading()

    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }))

    expect(location()).toBe('/recipes/5?q=x&servings=5 REPLACE')
    expect(screen.getByText('250 g')).toBeTruthy()
  })

  it('the stepper writes ?factor for a fixed-size recipe and drops it again at ×1', async () => {
    renderDetail('/recipes/5', { 5: recipe({ sizeNumber: null, sizeText: null }) })
    await heading()

    fireEvent.click(screen.getByRole('button', { name: 'Weniger' }))
    expect(location()).toBe('/recipes/5?factor=0.75 REPLACE')
    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }))
    expect(location()).toBe('/recipes/5 REPLACE')
    // A size change is a URL change, not a reload of the recipe.
    expect(foodly.getRecipe).toHaveBeenCalledTimes(1)
  })

  it('opening with ?servings shows the scaled amounts', async () => {
    renderDetail('/recipes/5?servings=8', { 5: recipe() })
    await heading()
    expect((screen.getByLabelText('Portionen') as HTMLInputElement).value).toBe('8')
    expect(screen.getByText('400 g')).toBeTruthy()
  })

  it.each(['servings=abc', 'servings=0', 'servings=-2', 'servings=2.5', 'factor=2'])(
    'opening with an invalid %s shows the base amounts',
    async (query) => {
      renderDetail(`/recipes/5?${query}`, { 5: recipe() })
      await heading()
      expect((screen.getByLabelText('Portionen') as HTMLInputElement).value).toBe('4')
      expect(screen.getByText('200 g')).toBeTruthy()
    },
  )
})

describe('RecipeDetail ticks', () => {
  const tick = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Zutaten abhaken' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mehl' }))
  }
  const ticked = () => (screen.queryByRole('checkbox', { name: 'Mehl' }) as HTMLInputElement | null)?.checked ?? false

  it('survive other re-renders and are gone in another recipe, without Web Storage', async () => {
    renderDetail('/recipes/5', {
      5: recipe(),
      6: recipe({ id: 6, name: 'Waffeln' }),
    })
    await heading()
    // Loading the recipe legitimately writes "recently viewed" to localStorage; only the ticks are checked.
    await waitFor(() => expect(localStorage.length).toBeGreaterThan(0))
    const storage = [
      vi.spyOn(Storage.prototype, 'getItem'),
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'removeItem'),
    ]

    tick()
    expect(ticked()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weniger' }))
    expect(ticked()).toBe(true)
    for (const spy of storage) expect(spy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('test-open-6'))
    await screen.findByRole('heading', { name: 'Waffeln' })
    expect(screen.getByRole('button', { name: 'Zutaten abhaken' }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Zutaten abhaken' }))
    expect(ticked()).toBe(false)
  })
})

describe('RecipeDetail actions', () => {
  // jsdom applies no media queries, so the phone layout is asserted through the `phone:` classes.
  it('a viewer gets „Kopie erstellen“ on every screen and no pencil', async () => {
    renderDetail('/recipes/5', { 5: recipe({ owner: 2, viewers: [1] }) })
    await heading()

    const copy = screen.getByRole('button', { name: 'Kopie erstellen' })
    expect(classesOf(copy)).toContain('phone:size-10')
    expect(classesOf(copy)).not.toContain('phone:hidden')
    expect(screen.queryByRole('link', { name: 'Bearbeiten' })).toBeNull()
  })

  it('an editor gets the pencil on phones, „Kopie erstellen“ only on desktop', async () => {
    renderDetail('/recipes/5', { 5: recipe({ owner: 2, editors: [1] }) })
    await heading()

    expect(classesOf(screen.getByRole('button', { name: 'Kopie erstellen' }))).toContain('phone:hidden')
    const pencil = screen.getByRole('link', { name: 'Bearbeiten' })
    expect(classesOf(pencil)).toContain('phone:size-10')
    expect(screen.queryByRole('button', { name: 'Löschen' })).toBeNull()
  })

  it('never says „Duplizieren“', async () => {
    renderDetail('/recipes/5', { 5: recipe() })
    await heading()
    expect(document.body.textContent).not.toMatch(/duplizier/i)
    expect(document.querySelector('[aria-label*="uplizier"]')).toBeNull()
  })
})

describe('RecipeDetail states', () => {
  it('loads with a skeleton in the shape of the head', async () => {
    renderDetail('/recipes/5', { 5: recipe() })
    const skeleton = screen.getByTestId('detail-skeleton')
    expect(classesOf(skeleton)).toContain('min-[1100px]:grid-cols-2')
    await heading()
    expect(screen.queryByTestId('detail-skeleton')).toBeNull()
  })

  it('shows the error', async () => {
    renderDetail('/recipes/9', {})
    expect(await screen.findByText('Rezept nicht gefunden')).toBeTruthy()
  })
})

describe('RecipeDetail sections', () => {
  const teig = { id: 1, name: 'Teig', steps: ['Rühren', 'Ruhen lassen'], ingredients: [] }
  const sosse = { id: 2, name: 'Soße', steps: ['Aufkochen'], ingredients: [] }

  it('shows no section title for a single named section', async () => {
    renderDetail('/recipes/5', { 5: recipe({ sections: [teig] }) })
    await screen.findByRole('heading', { level: 1, name: 'Pancakes' })
    expect(screen.queryByRole('heading', { name: 'Teig' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Zubereitung' })).toBeTruthy()
  })

  it('shows every section title once there are two, and numbers steps across them', async () => {
    renderDetail('/recipes/5', { 5: recipe({ sections: [teig, sosse] }) })
    await screen.findByRole('heading', { level: 1, name: 'Pancakes' })
    expect(screen.getByRole('heading', { level: 2, name: 'Teig' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Soße' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { name: 'Zubereitung' })).toHaveLength(2)

    const sosseSection = screen.getByRole('heading', { name: 'Soße' }).closest('section')!
    expect(within(within(sosseSection).getByRole('listitem')).getByText('3')).toBeTruthy()
  })

  it('gives an unnamed section no title next to a named one', async () => {
    renderDetail('/recipes/5', { 5: recipe({ sections: [{ ...teig, name: null }, sosse] }) })
    await screen.findByRole('heading', { level: 1, name: 'Pancakes' })
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Zubereitung', 'Soße'])
  })
})
