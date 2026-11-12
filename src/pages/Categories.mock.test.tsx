// The page inside the real app in mock mode: catalog, actions, shell and sidebar all real.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SUGGESTED_COLORS } from '../lib/categoryColor'
import { setViewport } from '../test/viewport'

// Mock mode is decided when src/api loads, so the app is imported fresh with VITE_MOCK=1 — which also gives every test
// fresh mock data (creates and deletes mutate it).
let api: typeof import('../api')
let App: typeof import('../App').default

beforeEach(async () => {
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  api = await import('../api')
  ;({ default: App } = await import('../App'))
  await api.bootstrap()
  setViewport(1200)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

// Each mock call waits 250 ms, and the first render pays for the fresh module graph.
const SLOW = 10_000

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/categories']}>
      <App />
    </MemoryRouter>,
  )
  const list = await screen.findByRole('list', { name: 'Meine Kategorien' }, { timeout: 3000 })
  return list
}

const main = () => screen.getByRole('main')
const sidebar = () => screen.getByRole('navigation', { name: 'Kategorien' })
const rowNames = (list: HTMLElement) =>
  within(list)
    .getAllByRole('listitem')
    .map((li) => within(li).getAllByRole('link')[0].textContent)

function openMenu(name: string) {
  fireEvent.keyDown(within(main()).getByRole('button', { name: `Aktionen für „${name}“` }), { key: 'Enter' })
}

describe('Categories page (mock mode)', () => {
  it(
    'lists the categories in their order with recipe counts',
    async () => {
      const list = await renderPage()
      expect(rowNames(list)).toEqual(['Favoriten', 'Schnelle Küche', 'Backen & Süßes', 'Meal Prep'])
      expect(within(list).getByText('4 Rezepte')).toBeTruthy()
      expect(within(list).getByText('2 Rezepte')).toBeTruthy()
    },
    SLOW,
  )

  it(
    'creates a category that shows on the page and in the sidebar',
    async () => {
      const list = await renderPage()
      fireEvent.click(within(main()).getByRole('button', { name: 'Neue Kategorie' }))
      const dialog = await screen.findByRole('dialog')
      fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Suppen' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 3000 })
      expect(rowNames(list)).toContain('Suppen')
      expect(within(sidebar()).getByText('Suppen')).toBeTruthy()
    },
    SLOW,
  )

  it(
    'renames and recolours a category on submit',
    async () => {
      const list = await renderPage()
      const update = vi.spyOn(api.foodly, 'updateCategory')
      openMenu('Favoriten')
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Bearbeiten' }))
      const dialog = await screen.findByRole('dialog')
      fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Lieblinge' } })
      fireEvent.click(within(dialog).getByRole('radio', { name: 'Farbe 3' }))
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 3000 })
      expect(rowNames(list)[0]).toBe('Lieblinge')
      expect(update).toHaveBeenCalledTimes(1)
      expect(update.mock.calls[0][1]).toMatchObject({ name: 'Lieblinge', color: SUGGESTED_COLORS[2] })
      // The dialog hands focus back to the row's ⋮ and leaves the page clickable.
      expect(document.activeElement).toBe(within(main()).getByRole('button', { name: 'Aktionen für „Lieblinge“' }))
      expect(document.body.style.pointerEvents).toBe('')
    },
    SLOW,
  )

  it(
    'deletes only after confirming',
    async () => {
      const list = await renderPage()
      openMenu('Meal Prep')
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
      let dialog = await screen.findByRole('alertdialog')
      expect(within(dialog).getByText('„Meal Prep“ löschen?')).toBeTruthy()
      expect(within(dialog).getByText('Die Rezepte bleiben erhalten, nur die Sammlung verschwindet.')).toBeTruthy()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
      expect(rowNames(list)).toContain('Meal Prep')
      expect(document.body.style.pointerEvents).toBe('')

      openMenu('Meal Prep')
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
      dialog = await screen.findByRole('alertdialog')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull(), { timeout: 3000 })
      expect(rowNames(list)).not.toContain('Meal Prep')
      expect(within(sidebar()).queryByText('Meal Prep')).toBeNull()
      expect(document.activeElement).toBe(within(main()).getByRole('button', { name: 'Neue Kategorie' }))
    },
    SLOW,
  )

  it(
    'keeps the dialog open with the message when saving fails',
    async () => {
      await renderPage()
      vi.spyOn(api.foodly, 'createCategory').mockRejectedValue(new Error('Name already taken'))
      fireEvent.click(within(main()).getByRole('button', { name: 'Neue Kategorie' }))
      const dialog = await screen.findByRole('dialog')
      fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Favoriten' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      expect((await within(dialog).findByRole('alert')).textContent).toContain('Name already taken')
      expect(screen.getByRole('dialog')).toBe(dialog)
      expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Favoriten')
    },
    SLOW,
  )

  describe('reordering', () => {
    const ORIGINAL = ['Favoriten', 'Schnelle Küche', 'Backen & Süßes', 'Meal Prep']
    const sidebarNames = () =>
      within(sidebar())
        .getAllByRole('link')
        .map((link) => link.textContent?.trim() ?? '')
        .filter((text) => ORIGINAL.some((name) => text.includes(name)))
        .map((text) => ORIGINAL.find((name) => text.includes(name)))
    const trigger = (name: string) => within(main()).getByRole('button', { name: `Aktionen für „${name}“` })
    const moveDown = async (name: string) => {
      openMenu(name)
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Nach unten' }))
    }
    function pendingFailure() {
      let reject!: (error: Error) => void
      const promise = new Promise<void>((_, rej) => (reject = rej))
      return { promise, reject }
    }

    it(
      'moves the first category down on the page and in the sidebar, keeping focus on its ⋮',
      async () => {
        const list = await renderPage()
        expect(sidebarNames()).toEqual(ORIGINAL)
        const reorder = vi.spyOn(api.foodly, 'reorderCategories')
        await moveDown('Favoriten')
        const moved = ['Schnelle Küche', 'Favoriten', 'Backen & Süßes', 'Meal Prep']
        expect(rowNames(list)).toEqual(moved)
        expect(sidebarNames()).toEqual(moved)
        await waitFor(() => expect(document.activeElement).toBe(trigger('Favoriten')))

        expect(reorder).toHaveBeenCalledTimes(1)
        await act(() => reorder.mock.results[0].value as Promise<void>)
        expect(rowNames(list)).toEqual(moved)
        expect(sidebarNames()).toEqual(moved)
        expect(screen.queryByText('Reihenfolge nicht gespeichert')).toBeNull()
      },
      SLOW,
    )

    it(
      'jumps back and says so when saving the order fails',
      async () => {
        const list = await renderPage()
        const call = pendingFailure()
        vi.spyOn(api.foodly, 'reorderCategories').mockReturnValue(call.promise)
        await moveDown('Favoriten')
        expect(rowNames(list)).toEqual(['Schnelle Küche', 'Favoriten', 'Backen & Süßes', 'Meal Prep'])
        await waitFor(() => expect(document.activeElement).toBe(trigger('Favoriten')))

        await act(async () => call.reject(new Error('boom')))
        await waitFor(() => expect(rowNames(list)).toEqual(ORIGINAL))
        expect(sidebarNames()).toEqual(ORIGINAL)
        expect(await screen.findByText('Reihenfolge nicht gespeichert')).toBeTruthy()
        expect(document.activeElement).toBe(trigger('Favoriten'))

        fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))
        expect(screen.queryByText('Reihenfolge nicht gespeichert')).toBeNull()
        expect(document.activeElement).toBe(trigger('Favoriten'))
      },
      SLOW,
    )

    it(
      'returns focus to the ⋮ when the menu is closed with Escape',
      async () => {
        await renderPage()
        openMenu('Favoriten')
        fireEvent.keyDown(await screen.findByRole('menu'), { key: 'Escape' })
        await waitFor(() => expect(document.activeElement).toBe(trigger('Favoriten')))
      },
      SLOW,
    )

    it(
      'shows no message when an earlier move fails but the latest one is saved',
      async () => {
        const list = await renderPage()
        const first = pendingFailure()
        const reorder = vi.spyOn(api.foodly, 'reorderCategories').mockImplementationOnce(() => first.promise)
        await moveDown('Favoriten')
        await waitFor(() => expect(document.activeElement).toBe(trigger('Favoriten')))
        await moveDown('Favoriten')
        const latest = ['Schnelle Küche', 'Backen & Süßes', 'Favoriten', 'Meal Prep']
        expect(rowNames(list)).toEqual(latest)

        await act(async () => first.reject(new Error('boom')))
        await waitFor(() => expect(reorder).toHaveBeenCalledTimes(2))
        await act(() => reorder.mock.results[1].value as Promise<void>)
        expect(rowNames(list)).toEqual(latest)
        expect(screen.queryByText('Reihenfolge nicht gespeichert')).toBeNull()
      },
      SLOW,
    )
  })
})
