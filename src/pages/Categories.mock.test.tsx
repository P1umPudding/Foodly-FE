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

const editor = (title: string) => screen.findByRole('form', { name: title })

function openMenu(name: string) {
  fireEvent.keyDown(within(main()).getByRole('button', { name: `Aktionen für „${name}“` }), { key: 'Enter' })
}

describe('Categories page (mock mode)', () => {
  // #243 AC1: a subpage — back arrow and title in the header, no back button in the content.
  it.each([1200, 390])(
    'shows back and title in the header, not in the content (%i px)',
    async (width) => {
      setViewport(width)
      await renderPage()
      const header = within(screen.getByRole('banner'))
      expect(header.getByRole('link', { name: 'Zurück' }).getAttribute('href')).toBe('/profile')
      header.getByText('Kategorien')
      expect(within(main()).queryByRole('link', { name: /Zurück/ })).toBeNull()
      expect(within(main()).queryByRole('button', { name: /Zurück/ })).toBeNull()
    },
    SLOW,
  )

  it(
    'lists the categories in their order with recipe counts',
    async () => {
      const list = await renderPage()
      expect(rowNames(list)).toEqual(['Favoriten', 'Schnelle Küche', 'Backen & Süßes', 'Meal Prep'])
      expect(within(list).getByText('4 Rezepte')).toBeTruthy()
      expect(within(list).getByText('2 Rezepte')).toBeTruthy()
      expect(within(list).getByRole('link', { name: 'Favoriten' }).getAttribute('href')).toBe('/categories/1')
    },
    SLOW,
  )

  it(
    'creates a category that shows on the page and in the sidebar',
    async () => {
      const list = await renderPage()
      fireEvent.click(within(main()).getByRole('button', { name: 'Neue Kategorie' }))
      // Inline under the list, like the mockup; no dialog.
      const form = await editor('Neue Kategorie')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(within(form).getByLabelText('Name'))
      fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Suppen' } })
      fireEvent.click(within(form).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(screen.queryByRole('form')).toBeNull(), { timeout: 3000 })
      expect(rowNames(list)).toContain('Suppen')
      expect(within(sidebar()).getByText('Suppen')).toBeTruthy()
      expect(document.activeElement).toBe(within(main()).getByRole('button', { name: 'Neue Kategorie' }))
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
      const form = await editor('Kategorie bearbeiten')
      await waitFor(() => expect(document.activeElement).toBe(within(form).getByLabelText('Name')))
      fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Lieblinge' } })
      fireEvent.click(within(form).getByRole('radio', { name: 'Farbe 3' }))
      fireEvent.click(within(form).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(screen.queryByRole('form')).toBeNull(), { timeout: 3000 })
      expect(rowNames(list)[0]).toBe('Lieblinge')
      expect(update).toHaveBeenCalledTimes(1)
      expect(update.mock.calls[0][1]).toMatchObject({ name: 'Lieblinge', color: SUGGESTED_COLORS[2] })
      // The editor hands focus back to the row's ⋮ and leaves the page clickable.
      expect(document.activeElement).toBe(within(main()).getByRole('button', { name: 'Aktionen für „Lieblinge“' }))
      expect(document.body.style.pointerEvents).toBe('')
    },
    SLOW,
  )

  it(
    'saves the grey swatch as a neutral category',
    async () => {
      await renderPage()
      const create = vi.spyOn(api.foodly, 'createCategory')
      fireEvent.click(within(main()).getByRole('button', { name: 'Neue Kategorie' }))
      const form = await editor('Neue Kategorie')
      fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Vorrat' } })
      fireEvent.click(within(form).getByRole('radio', { name: 'Farbe 12' }))
      fireEvent.click(within(form).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(screen.queryByRole('form')).toBeNull(), { timeout: 3000 })
      expect(create.mock.calls[0][0]).toMatchObject({ name: 'Vorrat', color: '#78716c' })
    },
    SLOW,
  )

  it(
    'cancels with Abbrechen or Escape, keeps one editor at a time, and returns focus',
    async () => {
      const list = await renderPage()
      const update = vi.spyOn(api.foodly, 'updateCategory')
      openMenu('Favoriten')
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Bearbeiten' }))
      let form = await editor('Kategorie bearbeiten')
      fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Verworfen' } })

      // Another Bearbeiten replaces the card and starts from that category.
      openMenu('Meal Prep')
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Bearbeiten' }))
      await waitFor(() =>
        expect((within(screen.getByRole('form')).getByLabelText('Name') as HTMLInputElement).value).toBe('Meal Prep'),
      )
      expect(screen.getAllByRole('form')).toHaveLength(1)

      form = screen.getByRole('form')
      fireEvent.click(within(form).getByRole('button', { name: 'Abbrechen' }))
      await waitFor(() => expect(screen.queryByRole('form')).toBeNull())
      expect(document.activeElement).toBe(within(main()).getByRole('button', { name: 'Aktionen für „Meal Prep“' }))

      openMenu('Favoriten')
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Bearbeiten' }))
      form = await editor('Kategorie bearbeiten')
      fireEvent.keyDown(within(form).getByLabelText('Name'), { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('form')).toBeNull())
      expect(document.activeElement).toBe(within(main()).getByRole('button', { name: 'Aktionen für „Favoriten“' }))

      expect(update).not.toHaveBeenCalled()
      expect(rowNames(list)[0]).toBe('Favoriten')
    },
    SLOW,
  )

  it(
    'closes the editor when its category is deleted',
    async () => {
      await renderPage()
      openMenu('Meal Prep')
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Bearbeiten' }))
      await editor('Kategorie bearbeiten')
      openMenu('Meal Prep')
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
      const dialog = await screen.findByRole('alertdialog')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull(), { timeout: 3000 })
      expect(screen.queryByRole('form')).toBeNull()
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
    'keeps the editor open with the message when saving fails',
    async () => {
      await renderPage()
      vi.spyOn(api.foodly, 'createCategory').mockRejectedValue(new Error('Name already taken'))
      fireEvent.click(within(main()).getByRole('button', { name: 'Neue Kategorie' }))
      const form = await editor('Neue Kategorie')
      fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Favoriten' } })
      fireEvent.click(within(form).getByRole('button', { name: 'Speichern' }))
      expect((await within(form).findByRole('alert')).textContent).toContain('Name already taken')
      expect(screen.getByRole('form')).toBe(form)
      expect((within(form).getByLabelText('Name') as HTMLInputElement).value).toBe('Favoriten')
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
      'keeps focus on the ⋮ when an upward move is rolled back',
      async () => {
        const list = await renderPage()
        const call = pendingFailure()
        vi.spyOn(api.foodly, 'reorderCategories').mockReturnValue(call.promise)
        openMenu('Schnelle Küche')
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Nach oben' }))
        expect(rowNames(list)).toEqual(['Schnelle Küche', 'Favoriten', 'Backen & Süßes', 'Meal Prep'])
        await waitFor(() => expect(document.activeElement).toBe(trigger('Schnelle Küche')))

        // The rollback re-inserts this row's <li> itself, which blurs its ⋮; React focuses it again after the commit.
        await act(async () => call.reject(new Error('boom')))
        await waitFor(() => expect(rowNames(list)).toEqual(ORIGINAL))
        expect(await screen.findByText('Reihenfolge nicht gespeichert')).toBeTruthy()
        expect(document.activeElement).toBe(trigger('Schnelle Küche'))
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
