import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import { mockData, mockRequest } from '../mocks'
import type { CreateRecipe, Recipe } from '../api/protocol'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '5' }),
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    name: 'Linsensuppe',
    tags: [],
    source: null,
    rating: [],
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: null,
    sizeText: null,
    notes: [],
    mainImage: null,
    images: [],
    sections: [],
    ...over,
  }
}

async function renderDetail(r: Recipe) {
  vi.spyOn(foodly, 'getRecipe').mockResolvedValue(r)
  render(
    <TooltipProvider>
      <RecipeDetail />
    </TooltipProvider>,
  )
  await waitFor(() => screen.getByRole('heading', { name: r.name }))
}

async function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
  return within(await screen.findByRole('alertdialog'))
}

afterEach(() => {
  vi.restoreAllMocks()
  navigate.mockReset()
})

describe('RecipeDetail delete', () => {
  it('shows the action to the owner only', async () => {
    await renderDetail(recipe({ owner: 1 }))
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeTruthy()
  })

  it.each([
    ['an editor', { owner: 2, editors: [1] }],
    ['a viewer', { owner: 2, viewers: [1] }],
  ])('hides the action from %s', async (_, over) => {
    await renderDetail(recipe(over))
    expect(screen.queryByRole('button', { name: 'Löschen' })).toBeNull()
  })

  it('cancelling does not delete', async () => {
    const del = vi.spyOn(foodly, 'deleteRecipe').mockResolvedValue()
    await renderDetail(recipe())

    const dialog = await openDialog()
    expect(dialog.getByText(/Linsensuppe/)).toBeTruthy()
    fireEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(del).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('confirming deletes through the mock handler and goes to the list', async () => {
    const input: CreateRecipe = {
      name: 'Zum Löschen',
      tags: [],
      source: null,
      time: null,
      workMinutes: null,
      overallMinutes: null,
      sizeNumber: null,
      sizeText: null,
      notes: [],
      mainImage: null,
      images: [],
      sections: [],
    }
    const seeded = (await mockRequest('recipes.create', { input })) as Recipe
    vi.spyOn(foodly, 'deleteRecipe').mockImplementation((id) => mockRequest('recipes.delete', { id }) as Promise<void>)
    await renderDetail(seeded)

    const dialog = await openDialog()
    fireEvent.click(dialog.getByRole('button', { name: 'Löschen' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/recipes', { replace: true }))
    expect(mockData.recipes.some((r) => r.id === seeded.id)).toBe(false)
  })

  it('disables both buttons while the delete runs', async () => {
    let resolve!: () => void
    vi.spyOn(foodly, 'deleteRecipe').mockReturnValue(new Promise<void>((r) => (resolve = r)))
    await renderDetail(recipe())

    const dialog = await openDialog()
    fireEvent.click(dialog.getByRole('button', { name: 'Löschen' }))

    await waitFor(() => expect(dialog.getByRole('button', { name: 'Löschen' }).hasAttribute('disabled')).toBe(true))
    expect(dialog.getByRole('button', { name: 'Abbrechen' }).hasAttribute('disabled')).toBe(true)

    resolve()
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })

  it('keeps the dialog open and shows the error when the delete fails', async () => {
    vi.spyOn(foodly, 'deleteRecipe').mockRejectedValue(new Error('Kaputt'))
    await renderDetail(recipe())

    const dialog = await openDialog()
    fireEvent.click(dialog.getByRole('button', { name: 'Löschen' }))

    expect((await dialog.findByRole('alert')).textContent).toBe('Kaputt')
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(dialog.getByRole('button', { name: 'Löschen' }).hasAttribute('disabled')).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
  })
})
