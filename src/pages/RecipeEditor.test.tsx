import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider, toast } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditor } from './RecipeEditor'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

const navigate = vi.fn()
let params: { id?: string } = {}

vi.mock('react-router-dom', () => ({
  useParams: () => params,
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../catalog/CatalogProvider', () => ({
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
  })

  it('will not create a nameless recipe', () => {
    params = {}
    view()

    expect((screen.getByRole('button', { name: 'Anlegen' }) as HTMLButtonElement).disabled).toBe(true)
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
    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files: [file] } })

    await waitFor(() => expect(screen.getByAltText('Hauptbild')).toBeTruthy())
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
  })

  it('surfaces a load failure', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockRejectedValue(new Error('weg'))
    view()

    await waitFor(() => screen.getByText('Rezept nicht gefunden'))
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

    expect((screen.getByRole('button', { name: 'Anlegen' }) as HTMLButtonElement).disabled).toBe(true)
    unmount()
    expect(error).not.toHaveBeenCalled()
  })
})
