import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserCategory } from '../api/protocol'

// Mock mode is decided when src/api loads: every app module is imported fresh with VITE_MOCK=1, so the spies hit
// the same foodly the catalog uses, and each test gets fresh mock data (categories.json: recipe 8 sits in 1 and 2,
// 13 in 1 and 3, 4 in none; recipe 3 belongs to someone else, user 1 is a viewer, and it sits in 2).
const desktop = vi.hoisted(() => ({ value: true }))
vi.mock('../hooks/useIsDesktop', () => ({ useIsDesktop: () => desktop.value }))

let api: typeof import('../api')
let RecipeDetail: typeof import('./RecipeDetail').RecipeDetail
let CatalogProvider: typeof import('../catalog/CatalogProvider').CatalogProvider
let TimerProvider: typeof import('../timers/TimerProvider').TimerProvider
let firstFreeColor: typeof import('../lib/categoryColor').firstFreeColor

beforeEach(async () => {
  desktop.value = true
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  api = await import('../api')
  ;({ RecipeDetail } = await import('./RecipeDetail'))
  ;({ CatalogProvider } = await import('../catalog/CatalogProvider'))
  ;({ TimerProvider } = await import('../timers/TimerProvider'))
  ;({ firstFreeColor } = await import('../lib/categoryColor'))
  await api.bootstrap()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

// Each mock call waits 250 ms, and the first render pays for the fresh module graph.
const SLOW = 10_000
const WAIT = { timeout: 3000 }

async function renderDetail(recipeId: number) {
  render(
    <TooltipProvider>
      <CatalogProvider>
        <TimerProvider userId={1}>
          <MemoryRouter initialEntries={[`/recipes/${recipeId}`]}>
            <Routes>
              <Route path="/recipes/:id" element={<RecipeDetail />} />
            </Routes>
          </MemoryRouter>
        </TimerProvider>
      </CatalogProvider>
    </TooltipProvider>,
  )
  await screen.findByRole('heading', { level: 1 }, WAIT)
}

// Chip links carry the category name; the "+" trigger sits after them.
async function chipNames() {
  const row = (await screen.findByRole('button', { name: /Kategorien ändern|Zu Kategorie hinzufügen/ }, WAIT))
    .parentElement!
  return within(row)
    .queryAllByRole('link')
    .map((a) => a.textContent?.slice(1))
}

async function openPanel() {
  fireEvent.click(await screen.findByRole('button', { name: /Kategorien ändern|Zu Kategorie hinzufügen/ }, WAIT))
  return screen.findByRole('dialog', { name: 'Kategorien' }, WAIT)
}

describe('RecipeDetail · Kategorie-Chips', () => {
  it(
    'shows the categories in order, linked to their list, and an icon-only "+"',
    async () => {
      await renderDetail(8)
      await waitFor(async () => expect(await chipNames()).toEqual(['Favoriten', 'Schnelle Küche']), WAIT)
      const plus = screen.getByRole('button', { name: 'Kategorien ändern' })
      expect(plus.textContent).toBe('')
      expect(screen.getByRole('link', { name: /Favoriten/ }).getAttribute('href')).toContain('cat=1')
    },
    SLOW,
  )

  it(
    'labels the "+" with its text when the recipe sits in no category',
    async () => {
      await renderDetail(4)
      const plus = await screen.findByRole('button', { name: 'Zu Kategorie hinzufügen' }, WAIT)
      expect(plus.textContent).toBe('Zu Kategorie hinzufügen')
      expect(await chipNames()).toEqual([])
    },
    SLOW,
  )

  it(
    'ticking adds the recipe after the existing ids and shows the chip',
    async () => {
      await renderDetail(8)
      const save = vi.spyOn(api.foodly, 'setCategoryRecipes')
      const panel = await openPanel()
      const box = within(panel).getByRole('checkbox', { name: 'Backen & Süßes' })
      expect((box as HTMLInputElement).checked).toBe(false)
      fireEvent.click(box)

      expect(save).toHaveBeenCalledWith(3, [2, 9, 13, 8])
      await waitFor(() => expect((box as HTMLInputElement).checked).toBe(true), WAIT)
      expect(screen.getByRole('link', { name: /Backen & Süßes/ })).toBeTruthy()
    },
    SLOW,
  )

  it(
    'unticking removes only this recipe and keeps the order of the others',
    async () => {
      await renderDetail(13)
      const save = vi.spyOn(api.foodly, 'setCategoryRecipes')
      const panel = await openPanel()
      const box = within(panel).getByRole('checkbox', { name: 'Favoriten' })
      fireEvent.click(box)

      expect(save).toHaveBeenCalledWith(1, [1, 6, 8])
      await waitFor(() => expect(screen.queryByRole('link', { name: /Favoriten/ })).toBeNull(), WAIT)
      expect((box as HTMLInputElement).checked).toBe(false)
    },
    SLOW,
  )

  it(
    'blocks the box while saving and leaves it unticked with the message when the save fails',
    async () => {
      await renderDetail(8)
      let fail!: (e: Error) => void
      const save = vi
        .spyOn(api.foodly, 'setCategoryRecipes')
        .mockReturnValueOnce(new Promise<UserCategory>((_, reject) => (fail = reject)))
      const panel = await openPanel()
      const box = within(panel).getByRole('checkbox', { name: 'Backen & Süßes' })
      fireEvent.click(box)

      await waitFor(() => expect(box.getAttribute('aria-disabled')).toBe('true'))
      fireEvent.click(box)
      expect(save).toHaveBeenCalledTimes(1)

      await act(async () => fail(new Error('kaputt')))
      expect(within(panel).getByRole('alert').textContent).toBe('kaputt')
      expect((box as HTMLInputElement).checked).toBe(false)
      expect(box.getAttribute('aria-disabled')).toBeNull()
      expect(screen.queryByRole('link', { name: /Backen & Süßes/ })).toBeNull()
    },
    SLOW,
  )

  it(
    'creates a category with the first free colour, assigns the recipe and clears the field',
    async () => {
      await renderDetail(8)
      const before = await api.foodly.listCategories()
      const create = vi.spyOn(api.foodly, 'createCategory')
      const panel = await openPanel()
      const field = within(panel).getByRole('textbox', { name: 'Neue Kategorie' })
      fireEvent.change(field, { target: { value: '  Suppen ' } })
      fireEvent.submit(field.closest('form')!)

      expect(create).toHaveBeenCalledWith({
        name: 'Suppen',
        color: firstFreeColor(before),
        colorLight: null,
        colorDark: null,
      })
      const box = await within(panel).findByRole('checkbox', { name: 'Suppen' }, WAIT)
      await waitFor(() => expect((box as HTMLInputElement).checked).toBe(true), WAIT)
      expect(screen.getByRole('link', { name: /Suppen/ })).toBeTruthy()
      expect((field as HTMLInputElement).value).toBe('')
    },
    SLOW,
  )

  it(
    'keeps the name and shows the message when creating fails',
    async () => {
      await renderDetail(8)
      vi.spyOn(api.foodly, 'createCategory').mockRejectedValueOnce(new Error('Name must not be empty'))
      const save = vi.spyOn(api.foodly, 'setCategoryRecipes')
      const panel = await openPanel()
      const field = within(panel).getByRole('textbox', { name: 'Neue Kategorie' })
      fireEvent.change(field, { target: { value: 'Suppen' } })
      fireEvent.submit(field.closest('form')!)

      expect((await within(panel).findByRole('alert', {}, WAIT)).textContent).toBe('Name must not be empty')
      expect((field as HTMLInputElement).value).toBe('Suppen')
      expect(save).not.toHaveBeenCalled()
    },
    SLOW,
  )

  it(
    'works for a recipe the user only views',
    async () => {
      await renderDetail(3)
      await waitFor(async () => expect(await chipNames()).toEqual(['Schnelle Küche']), WAIT)
      const save = vi.spyOn(api.foodly, 'setCategoryRecipes')
      const panel = await openPanel()
      fireEvent.click(within(panel).getByRole('checkbox', { name: 'Schnelle Küche' }))

      expect(save).toHaveBeenCalledWith(2, [5, 8, 12, 14])
      await waitFor(() => expect(screen.queryByRole('link', { name: /Schnelle Küche/ })).toBeNull(), WAIT)
    },
    SLOW,
  )

  it(
    'opens a popover on desktop',
    async () => {
      await renderDetail(8)
      expect((await openPanel()).getAttribute('data-slot')).toBe('popover-content')
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), WAIT)
    },
    SLOW,
  )

  it(
    'opens a sheet on phones',
    async () => {
      desktop.value = false
      await renderDetail(8)
      const sheet = await openPanel()
      expect(sheet.getAttribute('data-slot')).not.toBe('popover-content')
      expect(within(sheet).getByText('Kategorien')).toBeTruthy()
    },
    SLOW,
  )

  it(
    'offers only the create field when there are no categories at all',
    async () => {
      vi.spyOn(api.foodly, 'listCategories').mockResolvedValue([])
      await renderDetail(8)
      const panel = await openPanel()
      expect(within(panel).getByText('Noch keine Kategorien')).toBeTruthy()
      expect(within(panel).queryAllByRole('checkbox')).toHaveLength(0)
      expect(within(panel).getByRole('textbox', { name: 'Neue Kategorie' })).toBeTruthy()
    },
    SLOW,
  )

  it(
    'shows a retry instead of the list when the categories failed to load',
    async () => {
      vi.spyOn(api.foodly, 'listCategories').mockRejectedValue(new Error('offline'))
      await renderDetail(8)
      const panel = await openPanel()
      expect(within(panel).getByText('Kategorien nicht geladen')).toBeTruthy()
      expect(within(panel).getByRole('button', { name: 'Erneut versuchen' })).toBeTruthy()
      expect(within(panel).queryByRole('textbox')).toBeNull()
    },
    SLOW,
  )
})
