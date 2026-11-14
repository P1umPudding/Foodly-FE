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

// The chip links in the row of the "+" trigger, by their visible name (the letter mark is aria-hidden).
function chipNames() {
  const row = screen.getByRole('button', { name: /Kategorien ändern|Zu Kategorie hinzufügen/ }).parentElement!
  return within(row)
    .queryAllByRole('link')
    .map((a) =>
      Array.from(a.childNodes)
        .filter((n) => !(n instanceof Element && n.hasAttribute('aria-hidden')))
        .map((n) => n.textContent)
        .join(''),
    )
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
      await waitFor(() => expect(chipNames()).toEqual(['Favoriten', 'Schnelle Küche']), WAIT)
      const plus = screen.getByRole('button', { name: 'Kategorien ändern' })
      expect(plus.textContent).toBe('')
      expect(screen.getByRole('link', { name: 'Favoriten' }).getAttribute('href')).toBe('/categories/1')
    },
    SLOW,
  )

  it(
    'labels the "+" with its text when the recipe sits in no category',
    async () => {
      await renderDetail(4)
      const plus = await screen.findByRole('button', { name: 'Zu Kategorie hinzufügen' }, WAIT)
      expect(plus.textContent).toBe('Zu Kategorie hinzufügen')
      expect(chipNames()).toEqual([])
    },
    SLOW,
  )

  it(
    'ticking adds the recipe after the existing ids and shows the chip',
    async () => {
      await renderDetail(8)
      const save = vi.spyOn(api.foodly, 'setCategoryRecipes')
      const panel = await openPanel()
      const box = await within(panel).findByRole('checkbox', { name: 'Backen & Süßes' }, WAIT)
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
      await renderDetail(8)
      const save = vi.spyOn(api.foodly, 'setCategoryRecipes')
      const panel = await openPanel()
      const box = await within(panel).findByRole('checkbox', { name: 'Favoriten' }, WAIT)
      fireEvent.click(box)

      // 8 sits in the middle of [1, 6, 8, 13].
      expect(save).toHaveBeenCalledWith(1, [1, 6, 13])
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
      const box = await within(panel).findByRole('checkbox', { name: 'Backen & Süßes' }, WAIT)
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
      const save = vi.spyOn(api.foodly, 'setCategoryRecipes')
      const panel = await openPanel()
      const field = await within(panel).findByRole('textbox', { name: 'Neue Kategorie' }, WAIT)
      fireEvent.change(field, { target: { value: '  Suppen ' } })
      fireEvent.submit(field.closest('form')!)
      fireEvent.submit(field.closest('form')!)

      expect(create).toHaveBeenCalledTimes(1)
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
      const created = (await create.mock.results[0].value) as UserCategory
      expect(save).toHaveBeenCalledWith(created.id, [8])
    },
    SLOW,
  )

  it(
    'keeps a create running across closing the panel, and its name when it then fails',
    async () => {
      await renderDetail(8)
      let fail!: (e: Error) => void
      vi.spyOn(api.foodly, 'createCategory').mockReturnValueOnce(
        new Promise<UserCategory>((_, reject) => (fail = reject)),
      )
      let panel = await openPanel()
      const field = await within(panel).findByRole('textbox', { name: 'Neue Kategorie' }, WAIT)
      fireEvent.change(field, { target: { value: 'Suppen' } })
      fireEvent.submit(field.closest('form')!)
      await waitFor(() =>
        expect(within(panel).getByRole('checkbox', { name: 'Favoriten' }).getAttribute('aria-disabled')).toBe('true'),
      )

      fireEvent.keyDown(field, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), WAIT)
      panel = await openPanel()
      const again = within(panel).getByRole('textbox', { name: 'Neue Kategorie' }) as HTMLInputElement
      expect(again.value).toBe('Suppen')
      expect(again.readOnly).toBe(true)

      await act(async () => fail(new Error('Name must not be empty')))
      expect(within(panel).getByRole('alert').textContent).toBe('Name must not be empty')
      expect(again.value).toBe('Suppen')
      expect(again.readOnly).toBe(false)
    },
    SLOW,
  )

  it(
    'shows a save that failed after closing on reopen, without announcing it as new',
    async () => {
      await renderDetail(8)
      let fail!: (e: Error) => void
      vi.spyOn(api.foodly, 'setCategoryRecipes').mockReturnValueOnce(
        new Promise<UserCategory>((_, reject) => (fail = reject)),
      )
      let panel = await openPanel()
      const box = await within(panel).findByRole('checkbox', { name: 'Backen & Süßes' }, WAIT)
      fireEvent.click(box)
      fireEvent.keyDown(box, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), WAIT)

      await act(async () => fail(new Error('kaputt')))
      panel = await openPanel()
      expect(within(panel).queryByRole('alert')).toBeNull()
      expect(within(panel).getByText('kaputt')).toBeTruthy()
      expect((within(panel).getByRole('checkbox', { name: 'Backen & Süßes' }) as HTMLInputElement).checked).toBe(false)
    },
    SLOW,
  )

  it(
    'keeps a created category unticked with the message when assigning it fails',
    async () => {
      await renderDetail(8)
      vi.spyOn(api.foodly, 'setCategoryRecipes').mockRejectedValueOnce(new Error('recipe 8 not found'))
      const panel = await openPanel()
      const field = await within(panel).findByRole('textbox', { name: 'Neue Kategorie' }, WAIT)
      fireEvent.change(field, { target: { value: 'Suppen' } })
      fireEvent.submit(field.closest('form')!)

      expect((await within(panel).findByRole('alert', {}, WAIT)).textContent).toBe('recipe 8 not found')
      const box = within(panel).getByRole('checkbox', { name: 'Suppen' })
      expect((box as HTMLInputElement).checked).toBe(false)
      expect((field as HTMLInputElement).value).toBe('')
      expect(screen.queryByRole('link', { name: /Suppen/ })).toBeNull()
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
      const field = await within(panel).findByRole('textbox', { name: 'Neue Kategorie' }, WAIT)
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
      expect(screen.queryByRole('link', { name: 'Bearbeiten' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Weitere Aktionen' })).toBeNull()
      await waitFor(() => expect(chipNames()).toEqual(['Schnelle Küche']), WAIT)
      const save = vi.spyOn(api.foodly, 'setCategoryRecipes')
      const panel = await openPanel()
      fireEvent.click(await within(panel).findByRole('checkbox', { name: 'Schnelle Küche' }, WAIT))

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

  it(
    'hands the focus to the list once a retry loaded it',
    async () => {
      vi.spyOn(api.foodly, 'listCategories').mockRejectedValueOnce(new Error('offline'))
      await renderDetail(8)
      const panel = await openPanel()
      fireEvent.click(await within(panel).findByRole('button', { name: 'Erneut versuchen' }, WAIT))

      const first = await within(panel).findByRole('checkbox', { name: 'Favoriten' }, WAIT)
      await waitFor(() => expect(document.activeElement).toBe(first))
    },
    SLOW,
  )

  it(
    'puts the focus back on „Erneut versuchen“ when the retry fails too',
    async () => {
      vi.spyOn(api.foodly, 'listCategories').mockRejectedValue(new Error('offline'))
      await renderDetail(8)
      const panel = await openPanel()
      fireEvent.click(await within(panel).findByRole('button', { name: 'Erneut versuchen' }, WAIT))

      await waitFor(
        () => expect(document.activeElement).toBe(within(panel).getByRole('button', { name: 'Erneut versuchen' })),
        WAIT,
      )
    },
    SLOW,
  )
})
