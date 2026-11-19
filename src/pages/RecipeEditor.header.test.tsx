// The editor inside the real shell (#231): status and "Fertig" / "Anlegen" sit in the header, the old footer is gone.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditorRoute } from '../App'
import { AppShell } from '../components/shell/AppShell'
import { ThemeProvider } from '../theme/ThemeProvider'
import { TimerProvider } from '../timers/TimerProvider'
import { foodly } from '../api'
import { resetPendingSaves } from '../api/pendingSaves'
import type { Recipe } from '../api/protocol'
import { lazyPageLoaded } from '../test/lazyRoutes'

vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))

vi.mock('../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useMe: () => ({ id: 1, name: 'Kolja', profilePicture: null }),
  useCategories: () => ({ status: 'ready', list: [] }),
  useRefreshCategories: () => () => {},
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
}))

const recipe: Recipe = {
  id: 5,
  owner: 1,
  editors: [],
  viewers: [],
  createdAt: null,
  updatedAt: null,
  myAccessSince: null,
  rating: [],
  name: 'Pasta',
  tags: [],
  source: null,
  time: '20 min',
  workMinutes: 20,
  overallMinutes: 40,
  sizeNumber: 4,
  sizeText: '{Portionen}',
  notes: [],
  mainImage: null,
  images: [],
  sections: [{ id: 1, name: null, ingredients: [], steps: ['Kochen.'] }],
}

async function renderAt(path: string) {
  render(
    <ThemeProvider>
      <TooltipProvider>
        <TimerProvider userId={1}>
          <MemoryRouter initialEntries={[path]}>
            <AppShell>
              <Routes>
                <Route path="/recipes/new" element={<RecipeEditorRoute />} />
                <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
              </Routes>
            </AppShell>
          </MemoryRouter>
        </TimerProvider>
      </TooltipProvider>
    </ThemeProvider>,
  )
  await lazyPageLoaded()
}

const header = () => within(screen.getByRole('banner'))
const main = () => within(screen.getByRole('main'))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
  resetPendingSaves()
})
afterAll(() => vi.unstubAllEnvs())

describe('RecipeEditor in the shell header', () => {
  it('edit: "Fertig" and the save status are in the header, no footer hint in the page', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe)
    await renderAt('/recipes/5/edit')

    await waitFor(() => expect(header().getByRole('button', { name: 'Fertig' })).toBeTruthy())
    expect(header().getByText('Gespeichert')).toBeTruthy()
    expect(header().getByText('Rezept bearbeiten')).toBeTruthy()
    expect(main().queryByRole('button', { name: 'Fertig' })).toBeNull()
    expect(screen.queryByText(/automatisch gesichert/i)).toBeNull()
  })

  it('new: "Anlegen" is in the header, without a save status or a separate "Verwerfen"', async () => {
    await renderAt('/recipes/new')

    expect(header().getByRole('button', { name: 'Anlegen' })).toBeTruthy()
    expect(header().getByText('Neues Rezept')).toBeTruthy()
    expect(header().queryByText('Gespeichert')).toBeNull()
    expect(screen.queryByText('Verwerfen')).toBeNull()
    // Back is the way to discard.
    expect(header().getByRole('link', { name: 'Zurück' })).toBeTruthy()
  })

  it('a failed save shows "Nicht gespeichert" with its retry in the header', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe)
    vi.spyOn(foodly, 'updateRecipe').mockRejectedValue(new Error('offline'))
    await renderAt('/recipes/5/edit')

    await waitFor(() => expect(screen.getByLabelText('Titel')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'X' } })

    await waitFor(() => expect(header().getByText('Nicht gespeichert')).toBeTruthy(), { timeout: 3000 })
    expect(header().getByRole('button', { name: 'Erneut versuchen' })).toBeTruthy()
  })

  it('an invalid portion count shows "Portionen prüfen" in the header and holds "Fertig"', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe)
    await renderAt('/recipes/5/edit')

    await waitFor(() => expect(screen.getByLabelText('Anzahl')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Anzahl'), { target: { value: '0' } })

    expect(header().getByText('Nicht gespeichert – Portionen prüfen')).toBeTruthy()
    expect(header().getByRole('button', { name: 'Fertig' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('holds "Fertig" while photos are uploading, so none is dropped', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe)
    let finish: (v: { id: number; hash: string; name: null }) => void = () => {}
    vi.spyOn(foodly, 'uploadImage').mockImplementation(() => new Promise((r) => (finish = r)))
    await renderAt('/recipes/5/edit')

    await waitFor(() => expect(screen.getByLabelText('Titel')).toBeTruthy())
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Fotos hinzufügen'), { target: { files: [file] } })

    await waitFor(() =>
      expect(header().getByRole('button', { name: 'Fertig' }).getAttribute('aria-disabled')).toBe('true'),
    )
    expect(screen.getByText('Lädt hoch …')).toBeTruthy()
    await act(async () => finish({ id: 9, hash: 'h9', name: null }))
    expect(header().getByRole('button', { name: 'Fertig' }).getAttribute('aria-disabled')).toBe('false')
  })

  it('holds "Anlegen" while photos are uploading', async () => {
    let finish: (v: { id: number; hash: string; name: null }) => void = () => {}
    vi.spyOn(foodly, 'uploadImage').mockImplementation(() => new Promise((r) => (finish = r)))
    await renderAt('/recipes/new')

    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Neu' } })
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Fotos hinzufügen'), { target: { files: [file] } })

    await waitFor(() =>
      expect(header().getByRole('button', { name: 'Anlegen' }).getAttribute('aria-disabled')).toBe('true'),
    )
    await act(async () => finish({ id: 9, hash: 'h9', name: null }))
    expect(header().getByRole('button', { name: 'Anlegen' }).getAttribute('aria-disabled')).toBe('false')
  })

  it('nothing in the header while the recipe loads', async () => {
    vi.spyOn(foodly, 'getRecipe').mockReturnValue(new Promise(() => {}))
    await renderAt('/recipes/5/edit')

    expect(screen.getByTestId('editor-skeleton')).toBeTruthy()
    expect(header().queryByRole('button', { name: 'Fertig' })).toBeNull()
  })
})
