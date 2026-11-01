import { act, fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { Button, TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

// Real react-router here (unlike RecipeDetail.clone.test.tsx): /recipes/:id keeps one
// RecipeDetail instance across ids, and only a real route change reproduces stale clone state.

vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

function recipe(id: number): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    name: `Rezept ${id}`,
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
  }
}

function BackButton() {
  const navigate = useNavigate()
  return <Button onClick={() => navigate(-1)}>test-back</Button>
}

function renderAt(path: string) {
  vi.spyOn(foodly, 'getRecipe').mockImplementation(async (id) => recipe(id))
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={[path]}>
        <Link to="/recipes/6">test-go-6</Link>
        <BackButton />
        <Routes>
          <Route path="/recipes/:id" element={<RecipeDetail />} />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  )
}

const cloneButton = () => screen.getByRole('button', { name: /duplizieren/i }) as HTMLButtonElement

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RecipeDetail clone · real route change', () => {
  it('re-enables Duplizieren in the opened copy and after Back to the original', async () => {
    vi.spyOn(foodly, 'copyRecipe').mockResolvedValue(recipe(99))
    renderAt('/recipes/5')
    await screen.findByText('Rezept 5')

    fireEvent.click(cloneButton())

    await screen.findByText('Rezept 99')
    expect(foodly.getRecipe).toHaveBeenCalledWith(99)
    expect(cloneButton().disabled).toBe(false)

    fireEvent.click(screen.getByText('test-back'))

    await screen.findByText('Rezept 5')
    expect(cloneButton().disabled).toBe(false)
  })

  it('does not carry a clone error over to the next recipe', async () => {
    vi.spyOn(foodly, 'copyRecipe').mockRejectedValue(new Error('Kopieren fehlgeschlagen'))
    renderAt('/recipes/5')
    await screen.findByText('Rezept 5')

    fireEvent.click(cloneButton())

    await screen.findByText('Kopieren fehlgeschlagen')
    expect(cloneButton().disabled).toBe(false)

    fireEvent.click(screen.getByText('test-go-6'))

    await screen.findByText('Rezept 6')
    expect(screen.queryByText('Kopieren fehlgeschlagen')).toBeNull()
  })

  it('ignores a clone of the previous recipe that fails after switching', async () => {
    let reject!: (e: Error) => void
    vi.spyOn(foodly, 'copyRecipe').mockReturnValue(
      new Promise<Recipe>((_, r) => {
        reject = r
      }),
    )
    renderAt('/recipes/5')
    await screen.findByText('Rezept 5')

    fireEvent.click(cloneButton())
    fireEvent.click(screen.getByText('test-go-6'))
    await screen.findByText('Rezept 6')

    await act(async () => reject(new Error('Alter Fehler 5')))

    expect(screen.queryByText('Alter Fehler 5')).toBeNull()
    expect(cloneButton().disabled).toBe(false)
  })
})
