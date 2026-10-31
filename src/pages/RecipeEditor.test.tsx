import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
