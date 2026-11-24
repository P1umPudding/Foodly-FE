import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider, toast } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditor } from './RecipeEditor'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

const navigate = vi.fn()
let params: { id?: string } = {}

vi.mock('react-router', () => ({
  useParams: () => params,
  useNavigate: () => navigate,
  useLocation: () => ({ key: 'default', state: null }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

const refreshCategories = vi.hoisted(() => vi.fn())
vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => refreshCategories,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: { 1: { id: 1, name: 'Zwiebel' } }, status: 'ready' }),
  useCurrentUserId: () => 1,
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
    ...over,
  }
}

const view = () =>
  render(
    <TooltipProvider>
      <RecipeEditor />
    </TooltipProvider>,
  )

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  navigate.mockReset()
  refreshCategories.mockClear()
  params = {}
})

describe('RecipeEditor · new', () => {
  it('creates the recipe and swaps to the edit route', async () => {
    params = {}
    vi.spyOn(foodly, 'createRecipe').mockResolvedValue(recipe({ id: 42 }))
    view()

    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Neues Rezept' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }))

    await waitFor(() =>
      expect(foodly.createRecipe).toHaveBeenCalledWith(expect.objectContaining({ name: 'Neues Rezept' })),
    )
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/recipes/42/edit', { replace: true }))
    expect(refreshCategories).toHaveBeenCalledTimes(1)
  })

  it('will not create a nameless recipe', () => {
    params = {}
    const create = vi.spyOn(foodly, 'createRecipe')
    view()

    const anlegen = screen.getByRole('button', { name: 'Anlegen' })
    expect(anlegen.getAttribute('aria-disabled')).toBe('true')
    // aria-disabled keeps it focusable, so a keyboard activation still arrives as a click.
    fireEvent.click(anlegen)
    expect(create).not.toHaveBeenCalled()
  })
})

describe('RecipeEditor · edit', () => {
  it('autosaves a change and carries `time` through untouched', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    const update = vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    view()

    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Pasta'))

    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Pasta bianca' } })

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1), { timeout: 3000 })
    expect(update).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Pasta bianca', time: '20 min' }))
  })

  it('keeps the uploaded ref in the draft and saves only its id', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'uploadImage').mockResolvedValue({ id: 77, hash: 'h77', name: null })
    const update = vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    view()

    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Pasta'))
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Fotos hinzufügen'), { target: { files: [file] } })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Hauptbild' })).toBeTruthy())
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1), { timeout: 3000 })
    expect(update).toHaveBeenCalledWith(5, expect.objectContaining({ mainImage: 77, images: [] }))
  })

  it('shows a retry when the save fails', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'updateRecipe').mockRejectedValue(new Error('offline'))
    view()

    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Pasta'))
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'X' } })

    await waitFor(() => screen.getByText('Nicht gespeichert'), { timeout: 3000 })
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeTruthy()
  })

  it('refuses to edit a recipe the user may only view', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe({ owner: 2, viewers: [1] }))
    view()

    await waitFor(() => screen.getByText('Kein Zugriff'))
    expect(screen.queryByLabelText('Titel')).toBeNull()
    // No tab bar on the phone editor: the page itself keeps clear of the bottom edge (#218).
    expect(screen.getByText('Kein Zugriff').closest('.max-w-3xl')!.className.split(/\s+/)).toContain(
      'phone:pb-[calc(2.5rem+env(safe-area-inset-bottom))]',
    )
  })

  it('surfaces a load failure as the neutral error card, without the raw message', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockRejectedValue(new Error('recipe 5 not found'))
    view()

    await waitFor(() => screen.getByText('Rezept konnte nicht geladen werden'))
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeTruthy()
    expect(screen.getByText('Zur Liste')).toBeTruthy()
    expect(screen.queryByText(/not found/)).toBeNull()
    expect(screen.getByText('Rezept konnte nicht geladen werden').closest('.pb-10')!.className.split(/\s+/)).toContain(
      'phone:pb-[calc(2.5rem+env(safe-area-inset-bottom))]',
    )
  })

  it('retries a failed load and then shows the editor', async () => {
    params = { id: '5' }
    const get = vi.spyOn(foodly, 'getRecipe').mockRejectedValueOnce(new Error('weg')).mockResolvedValue(recipe())
    view()

    fireEvent.click(await screen.findByRole('button', { name: 'Erneut versuchen' }))
    expect(screen.getByTestId('editor-skeleton')).toBeTruthy()
    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Pasta'))
    expect(get).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Kein Zugriff')).toBeNull()
  })

  it('orders the phone flow images first, notes and source last, with safe-area room below (#218)', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    view()

    await waitFor(() => screen.getByLabelText('Titel'))
    // jsdom can't lay out `order`, so the classes stand in for the phone order; DOM order stays main → side.
    const block = (name: string) => screen.getByRole('heading', { name }).closest('section')!.className.split(/\s+/)
    expect(block('Bilder')).toContain('phone:order-first')
    expect(block('Notizen')).toContain('phone:order-last')
    expect(screen.getByLabelText('Quelle').closest('section')!.className.split(/\s+/)).toContain('phone:order-last')
    expect(screen.getByRole('heading', { level: 1 }).parentElement!.className.split(/\s+/)).toContain(
      'phone:pb-[calc(2.5rem+env(safe-area-inset-bottom))]',
    )
  })

  it('keeps the phone order and safe-area room in the loading skeleton (#218)', () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockReturnValue(new Promise(() => {}))
    view()

    const skeleton = screen.getByTestId('editor-skeleton')
    expect(skeleton.lastElementChild!.className.split(/\s+/)).toContain('phone:order-first')
    expect(skeleton.parentElement!.className.split(/\s+/)).toContain(
      'phone:pb-[calc(2.5rem+env(safe-area-inset-bottom))]',
    )
  })

  it('shows a loaded Zusatz and saves an edit to it', async () => {
    params = { id: '5' }
    const loaded = recipe({
      sections: [
        {
          id: 1,
          name: null,
          ingredients: [
            {
              id: 7,
              ingredient: { id: 1, name: 'Zwiebel' },
              text: 'gehackt',
              amount: '1',
              amountPrefix: null,
              unit: null,
            },
          ],
          steps: ['Kochen.'],
        },
      ],
    })
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(loaded)
    const update = vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(loaded)
    view()

    await waitFor(() => expect((screen.getByLabelText('Zusatz') as HTMLInputElement).value).toBe('gehackt'))

    fireEvent.change(screen.getByLabelText('Zusatz'), { target: { value: 'nach Geschmack' } })

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1), { timeout: 3000 })
    expect(update.mock.calls[0][1].sections[0].ingredients[0]).toMatchObject({ ingredient: 1, text: 'nach Geschmack' })
  })

  it('adds a section', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    view()

    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Pasta'))
    expect(screen.getAllByLabelText('Abschnittsname')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /abschnitt hinzufügen/i }))

    expect(screen.getAllByLabelText('Abschnittsname')).toHaveLength(2)
    expect(screen.getByText(/Ein Abschnitt ohne Namen ist der Normalfall/)).toBeTruthy()
    // The timer hint sits in the first section only.
    expect(screen.getAllByText(/werden im Rezept zu Timern/)).toHaveLength(1)
  })

  it('moves a section down via its ⋯ menu and puts focus on "Abschnitt hinzufügen" after removing one', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    view()

    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Pasta'))
    fireEvent.click(screen.getByRole('button', { name: /abschnitt hinzufügen/i }))
    fireEvent.change(screen.getAllByLabelText('Abschnittsname')[1], { target: { value: 'Teig' } })

    fireEvent.keyDown(screen.getByRole('button', { name: 'Abschnitt 1: Aktionen' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Nach unten' }))
    expect((screen.getAllByLabelText('Abschnittsname')[0] as HTMLInputElement).value).toBe('Teig')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

    fireEvent.keyDown(screen.getByRole('button', { name: 'Abschnitt 2: Aktionen' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Entfernen' }))
    expect(screen.getAllByLabelText('Abschnittsname')).toHaveLength(1)
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /abschnitt hinzufügen/i })),
    )
  })
})

// Runs the 800 ms autosave debounce out (fake timers that still advance, so waitFor keeps working).
const pastDebounce = () => act(() => vi.advanceTimersByTimeAsync(800))
const count = () => screen.getByLabelText('Anzahl') as HTMLInputElement
const HINT = 'Nicht gespeichert – Portionen prüfen'

describe('RecipeEditor · portion count below 1', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('saves nothing while the count is invalid, then saves the fix with every edit made meanwhile', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    const update = vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    view()
    await waitFor(() => expect(count().value).toBe('4'))

    fireEvent.change(count(), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Pasta bianca' } })
    await pastDebounce()

    expect(update).not.toHaveBeenCalled()
    expect(screen.getByText(HINT)).toBeTruthy()
    const done = screen.getByRole('button', { name: 'Fertig' })
    expect(done.getAttribute('aria-disabled')).toBe('true')
    // finish() is async: let it run out before checking it did not navigate.
    await act(async () => {
      fireEvent.click(done)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(navigate).not.toHaveBeenCalled()

    fireEvent.change(count(), { target: { value: '3' } })
    await pastDebounce()
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Pasta bianca', sizeNumber: 3 }))
    expect(screen.queryByText(HINT)).toBeNull()
  })

  it('still saves a valid edit whose debounce runs into an invalid count', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    const update = vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    view()
    await waitFor(() => expect(count().value).toBe('4'))

    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Pasta bianca' } })
    fireEvent.change(count(), { target: { value: '0' } })
    await pastDebounce()

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Pasta bianca', sizeNumber: 4 }))
    await pastDebounce()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('flags old data with 0 portions at once and saves only once it is fixed', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe({ sizeNumber: 0 }))
    const update = vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    view()
    await waitFor(() => expect(count().value).toBe('0'))

    expect(screen.getByText('Mindestens 1 Portion.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Pasta bianca' } })
    await pastDebounce()
    expect(update).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Fertig' }).getAttribute('aria-disabled')).toBe('true')

    fireEvent.change(count(), { target: { value: '2' } })
    await pastDebounce()
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Pasta bianca', sizeNumber: 2 }))
  })

  it('tells on leaving that edits held back by an invalid count were not saved', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    const update = vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    const error = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    const { unmount } = view()
    await waitFor(() => expect(count().value).toBe('4'))

    fireEvent.change(count(), { target: { value: '-2' } })
    unmount()

    expect(error).toHaveBeenCalledWith('Änderungen nicht gespeichert – Portionen prüfen.')
    await pastDebounce()
    expect(update).not.toHaveBeenCalled()
  })

  it('leaves untouched old data without a toast', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe({ sizeNumber: 0 }))
    const error = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    const { unmount } = view()
    await waitFor(() => expect(count().value).toBe('0'))

    unmount()

    expect(error).not.toHaveBeenCalled()
  })

  it('will not create a recipe with an invalid count, and discarding it is silent', () => {
    params = {}
    const error = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    const { unmount } = view()

    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Neues Rezept' } })
    fireEvent.change(count(), { target: { value: '0' } })

    const create = vi.spyOn(foodly, 'createRecipe')
    const anlegen = screen.getByRole('button', { name: 'Anlegen' })
    expect(anlegen.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(anlegen)
    expect(create).not.toHaveBeenCalled()
    unmount()
    expect(error).not.toHaveBeenCalled()
  })
})
