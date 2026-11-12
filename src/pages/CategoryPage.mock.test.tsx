// The category page inside the real app in mock mode: catalog, search, shell and sidebar all real.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_STATE } from '../list/state'
import { loadPersisted, savePersisted } from '../list/persistence'
import { setViewport } from '../test/viewport'

// Mock mode is decided when src/api loads, so the app is imported fresh with VITE_MOCK=1 — which also gives every test
// fresh mock data (creates, renames and deletes mutate it).
let api: typeof import('../api')
let App: typeof import('../App').default

beforeEach(async () => {
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  api = await import('../api')
  ;({ default: App } = await import('../App'))
  await api.bootstrap()
  setViewport(1200)
  localStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

// Each mock call waits 250 ms, and the first render pays for the fresh module graph.
const SLOW = 10_000
const WAIT = { timeout: 3000 }

let navigate: NavigateFunction
let location = ''
function Probe() {
  navigate = useNavigate()
  const { pathname, search } = useLocation()
  location = pathname + search
  return null
}

async function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Probe />
    </MemoryRouter>,
  )
  // The shell mounts once the auth guard has settled.
  await screen.findByRole('main', {}, WAIT)
}

const main = () => screen.getByRole('main')
const sidebar = () => screen.getByRole('navigation', { name: 'Kategorien' })
const heading = () => within(main()).findByRole('heading', { level: 1 }, WAIT)
const rowLink = (name: string) => within(main()).findByRole('link', { name: new RegExp(name) }, WAIT)

describe('Category page (mock mode)', () => {
  it(
    'shows the head and exactly the recipes of the category, without its own dot',
    async () => {
      const search = vi.spyOn(api.foodly, 'searchRecipes')
      await renderAt('/categories/2')
      expect((await heading()).textContent).toBe('Schnelle Küche')
      expect(within(main()).getByText('5 Rezepte · nur für dich sichtbar')).toBeTruthy()

      await rowLink('Guacamole')
      const rows = ['Pfannkuchen', 'Griechischer Bauernsalat', 'Guacamole', 'Cremige Tomatensuppe', 'Asiatische']
      for (const name of rows) expect(within(main()).getByRole('link', { name: new RegExp(name) })).toBeTruthy()
      expect(within(main()).queryByRole('link', { name: /Ofengemüse/ })).toBeNull()
      expect(search.mock.calls[0][0]).toMatchObject({ filters: { categories: [2] } })

      // Guacamole is in "Favoriten" too: that dot stays, this category's goes from every row.
      expect(within(main()).getByText('Kategorien: Favoriten')).toBeTruthy()
      expect(within(main()).queryByText(/Kategorien:.*Schnelle Küche/)).toBeNull()
    },
    SLOW,
  )

  it(
    'shows the empty text for a category without recipes',
    async () => {
      await api.foodly.createCategory({ name: 'Suppen', color: '#0ea5e9', colorLight: null, colorDark: null })
      const created = (await api.foodly.listCategories()).find((c) => c.name === 'Suppen')!
      await renderAt(`/categories/${created.id}`)
      expect(
        await within(main()).findByText(
          'Noch nichts in „Suppen“. Öffne ein Rezept und füg es über „+“ hinzu.',
          {},
          WAIT,
        ),
      ).toBeTruthy()
      expect(within(main()).getByText('0 Rezepte · nur für dich sichtbar')).toBeTruthy()
    },
    SLOW,
  )

  it(
    'says "Kategorie nicht gefunden" for an unknown or malformed id',
    async () => {
      const search = vi.spyOn(api.foodly, 'searchRecipes')
      await renderAt('/categories/999')
      expect((await heading()).textContent).toBe('Kategorie nicht gefunden')
      expect(within(main()).getByRole('link', { name: 'Zu den Rezepten' }).getAttribute('href')).toBe('/recipes')

      navigate('/categories/abc')
      await waitFor(() => expect(location).toBe('/categories/abc'))
      expect((await heading()).textContent).toBe('Kategorie nicht gefunden')
      expect(search).not.toHaveBeenCalled()
    },
    SLOW,
  )

  it(
    'keeps sort and view in its own URL, not in the stored list state',
    async () => {
      const stored = { ...DEFAULT_STATE, sortKey: 'work' as const, detail: 'tiles' as const }
      savePersisted(1, stored)
      const before = loadPersisted(1)
      await renderAt('/categories/2')
      await rowLink('Guacamole')

      fireEvent.keyDown(within(main()).getByRole('button', { name: /^Sortieren:/ }), { key: 'Enter' })
      fireEvent.click(await screen.findByRole('menuitemradio', { name: /Bewertung/ }))
      await waitFor(() => expect(location).toBe('/categories/2?sort=rating'))
      fireEvent.click(within(main()).getByRole('radio', { name: 'Kompakt' }))
      await waitFor(() => expect(location).toBe('/categories/2?sort=rating&view=compact'))

      expect(loadPersisted(1)).toEqual(before)
      expect(within(main()).queryByRole('group', { name: 'Gliederung' })).toBeNull()

      // A search without hits is not an empty category.
      fireEvent.change(within(main()).getByRole('textbox', { name: 'In „Schnelle Küche“ suchen' }), {
        target: { value: 'zzz' },
      })
      expect(await within(main()).findByText('Keine Treffer.')).toBeTruthy()
      expect(location).toBe('/categories/2?q=zzz&sort=rating&view=compact')
      expect(within(main()).queryByText(/Noch nichts in/)).toBeNull()
    },
    SLOW,
  )

  it(
    'renames the category from its head; head and sidebar follow',
    async () => {
      await renderAt('/categories/2')
      await heading()
      fireEvent.click(within(main()).getByRole('button', { name: 'Bearbeiten' }))
      const dialog = await screen.findByRole('dialog')
      fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Flott' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), WAIT)
      expect((await heading()).textContent).toBe('Flott')
      expect(within(sidebar()).getByText('Flott')).toBeTruthy()
      expect(within(sidebar()).queryByText('Schnelle Küche')).toBeNull()
    },
    SLOW,
  )

  it(
    'shows skeletons while loading and a retry when the recipes fail',
    async () => {
      vi.spyOn(api.foodly, 'searchRecipes').mockRejectedValueOnce(new Error('Server weg'))
      await renderAt('/categories/2')
      await heading()
      const alert = await within(main()).findByRole('alert', {}, WAIT)
      expect(alert.textContent).toContain('Konnte Rezepte nicht laden')
      fireEvent.click(within(main()).getByRole('button', { name: 'Erneut versuchen' }))
      expect(within(main()).getAllByTestId('row-skeleton').length).toBeGreaterThan(0)
      expect(await rowLink('Guacamole')).toBeTruthy()
    },
    SLOW,
  )

  it(
    'waits for the categories with a skeleton and offers a retry when they fail',
    async () => {
      vi.spyOn(api.foodly, 'listCategories').mockRejectedValueOnce(new Error('Server weg'))
      await renderAt('/categories/2')
      const alert = await within(main()).findByRole('alert', {}, WAIT)
      expect(alert.textContent).toContain('Konnte Kategorien nicht laden')
      expect(within(main()).queryByText('Kategorie nicht gefunden')).toBeNull()
      fireEvent.click(within(main()).getByRole('button', { name: 'Erneut versuchen' }))
      expect(within(main()).getByTestId('category-head-skeleton')).toBeTruthy()
      expect((await heading()).textContent).toBe('Schnelle Küche')
    },
    SLOW,
  )

  it(
    'turns into "nicht gefunden" once the category is deleted elsewhere',
    async () => {
      await renderAt('/categories/4')
      expect((await heading()).textContent).toBe('Meal Prep')
      navigate('/categories')
      fireEvent.keyDown(await within(main()).findByRole('button', { name: 'Aktionen für „Meal Prep“' }, WAIT), {
        key: 'Enter',
      })
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
      const dialog = await screen.findByRole('alertdialog')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull(), WAIT)

      navigate('/categories/4')
      await waitFor(() => expect(location).toBe('/categories/4'))
      expect((await heading()).textContent).toBe('Kategorie nicht gefunden')
    },
    SLOW,
  )

  it(
    'offers "Bearbeiten" in the ⋮ menu on phones',
    async () => {
      setViewport(400)
      await renderAt('/categories/2')
      await heading()
      expect(within(main()).queryByRole('button', { name: 'Bearbeiten' })).toBeNull()
      fireEvent.keyDown(within(main()).getByRole('button', { name: 'Aktionen für „Schnelle Küche“' }), {
        key: 'Enter',
      })
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Bearbeiten' }))
      expect(await screen.findByRole('dialog')).toBeTruthy()
    },
    SLOW,
  )
})
