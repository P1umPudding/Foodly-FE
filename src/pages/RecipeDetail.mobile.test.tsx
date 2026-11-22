import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider, buttonVariants } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'
import { setViewport } from '../test/viewport'

// #301: on phones the action row's two toggles move into the header's ⋯ menu.

vi.mock('../components/category/RecipeCategoryChips', () => ({ RecipeCategoryChips: () => null }))
vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
  useUsers: () => [],
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

const OWNER = { owner: 1 }
const EDITOR = { owner: 2, editors: [1] }
const VIEWER = { owner: 2, viewers: [1] }

async function renderDetail(over: Partial<Recipe>, width = 390) {
  setViewport(width)
  vi.spyOn(foodly, 'getRecipe').mockImplementation(async (id) =>
    recipe({ ...over, id, name: id === 5 ? 'Pancakes' : 'Waffeln' }),
  )
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={['/recipes/5']}>
        <Link to="/recipes/6">test-open-6</Link>
        <Routes>
          <Route path="/recipes/:id" element={<RecipeDetail />} />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  )
  await screen.findByRole('heading', { name: 'Pancakes' })
}

// Radix opens the menu on keyDown, not on click.
async function openMenu() {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Weitere Aktionen' }), { key: 'Enter' })
  return within(await screen.findByRole('menu'))
}

const classesOf = (el: Element) => el.className.split(/\s+/)
// jsdom applies no CSS: the row toggles stay in the DOM, hidden on phones by their wrapper's class.
const rowToggle = (name: string) => screen.getByRole('button', { name })

function stubWakeLock() {
  const release = vi.fn().mockResolvedValue(undefined)
  const request = vi.fn().mockResolvedValue({ release })
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  return { request, release }
}

afterEach(() => {
  vi.restoreAllMocks()
  delete (navigator as { wakeLock?: unknown }).wakeLock
  setViewport(1024)
})

describe('RecipeDetail on phones (#301)', () => {
  it('keeps the action row on one line and hides its toggles there', async () => {
    await renderDetail(OWNER)
    const toggles = rowToggle('Zutaten abhaken').parentElement!
    expect(classesOf(toggles)).toContain('phone:hidden')
    expect(classesOf(toggles)).not.toContain('phone:basis-full')
    expect(classesOf(toggles.parentElement!)).toContain('phone:flex-nowrap')
  })

  it.each([
    ['owner', OWNER],
    ['editor', EDITOR],
    ['viewer', VIEWER],
  ])('gives the %s „Zutaten abhaken“ behind ⋯, switchable, with its state', async (_role, over) => {
    await renderDetail(over)
    const menu = await openMenu()
    const item = menu.getByRole('menuitemcheckbox', { name: 'Zutaten abhaken' })
    expect(item.getAttribute('aria-checked')).toBe('false')
    expect(screen.queryByRole('checkbox')).toBeNull()

    fireEvent.click(item)
    // The menu stays open, so the new state shows right away.
    expect(menu.getByRole('menuitemcheckbox', { name: 'Zutaten abhaken' }).getAttribute('aria-checked')).toBe('true')
    expect(rowToggle('Zutaten abhaken').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
  })

  it('switches „Bildschirm anlassen“ behind ⋯ and requests the lock', async () => {
    const { request } = stubWakeLock()
    await renderDetail(VIEWER)
    const menu = await openMenu()
    const item = menu.getByRole('menuitemcheckbox', { name: 'Bildschirm anlassen' })
    expect(item.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(item)
    expect(item.getAttribute('aria-checked')).toBe('true')
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))
  })

  it('keeps the lock on when the menu closes', async () => {
    const { request, release } = stubWakeLock()
    await renderDetail(OWNER)
    fireEvent.click((await openMenu()).getByRole('menuitemcheckbox', { name: 'Bildschirm anlassen' }))
    await waitFor(() => expect(request).toHaveBeenCalled())
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(rowToggle('Bildschirm anlassen').getAttribute('aria-pressed')).toBe('true')
    expect(release).not.toHaveBeenCalled()
  })

  it('releases the lock when another recipe opens', async () => {
    const { request, release } = stubWakeLock()
    await renderDetail(OWNER)
    fireEvent.click((await openMenu()).getByRole('menuitemcheckbox', { name: 'Bildschirm anlassen' }))
    await waitFor(() => expect(request).toHaveBeenCalled())
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

    fireEvent.click(screen.getByText('test-open-6'))
    await screen.findByRole('heading', { name: 'Waffeln' })
    await waitFor(() => expect(release).toHaveBeenCalled())
    expect(rowToggle('Bildschirm anlassen').getAttribute('aria-pressed')).toBe('false')
  })

  it('leaves out „Bildschirm anlassen“ without the Wake Lock API', async () => {
    await renderDetail(OWNER)
    const menu = await openMenu()
    expect(menu.queryByRole('menuitemcheckbox', { name: 'Bildschirm anlassen' })).toBeNull()
    expect(menu.getByRole('menuitemcheckbox', { name: 'Zutaten abhaken' })).toBeTruthy()
  })

  it('offers „Löschen“ to the owner only', async () => {
    await renderDetail(OWNER)
    expect((await openMenu()).getByRole('menuitem', { name: 'Löschen' })).toBeTruthy()
  })

  it.each([
    ['editor', EDITOR],
    ['viewer', VIEWER],
  ])('has no „Löschen“ for the %s', async (_role, over) => {
    await renderDetail(over)
    expect((await openMenu()).queryByRole('menuitem', { name: 'Löschen' })).toBeNull()
  })

  it('renders the pencil as ghost', async () => {
    await renderDetail(EDITOR)
    const pencil = classesOf(screen.getByRole('link', { name: 'Bearbeiten' }))
    expect(pencil).toEqual(
      expect.arrayContaining(
        buttonVariants({ variant: 'ghost', size: 'sm' })
          .split(' ')
          .filter((c) => !c.startsWith('gap-')),
      ),
    )
    for (const outlineOnly of ['border', 'bg-background', 'shadow-xs', 'dark:border-input'])
      expect(pencil).not.toContain(outlineOnly)
  })

  it('drops the toggle items when the window grows to desktop with the menu open', async () => {
    await renderDetail(OWNER)
    const menu = await openMenu()
    expect(menu.getByRole('menuitemcheckbox', { name: 'Zutaten abhaken' })).toBeTruthy()
    setViewport(1024)
    expect(screen.queryByRole('menuitemcheckbox')).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Löschen' })).toBeTruthy()
  })
})

describe('RecipeDetail on desktop (#301: unchanged)', () => {
  it.each([
    ['owner', OWNER],
    ['editor', EDITOR],
    ['viewer', VIEWER],
  ])('shows both toggles in the action row for the %s', async (_role, over) => {
    stubWakeLock()
    await renderDetail(over, 1024)
    expect(rowToggle('Zutaten abhaken')).toBeTruthy()
    expect(rowToggle('Bildschirm anlassen')).toBeTruthy()
  })

  it('keeps ⋯ owner-only with just „Löschen“', async () => {
    await renderDetail(OWNER, 1024)
    const menu = await openMenu()
    expect(menu.queryAllByRole('menuitemcheckbox')).toHaveLength(0)
    expect(menu.getAllByRole('menuitem').map((el) => el.textContent?.trim())).toEqual(['Löschen'])
  })

  it.each([
    ['editor', EDITOR],
    ['viewer', VIEWER],
  ])('shows no ⋯ to the %s', async (_role, over) => {
    await renderDetail(over, 1024)
    expect(screen.queryByRole('button', { name: 'Weitere Aktionen' })).toBeNull()
  })

  it('keeps the outline pencil', async () => {
    await renderDetail(OWNER, 1024)
    expect(classesOf(screen.getByRole('link', { name: 'Bearbeiten' }))).toContain('border')
  })
})
