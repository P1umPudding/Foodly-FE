import { useEffect, useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditorRoute } from '../App'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

// Real react-router here (unlike RecipeEditor.test.tsx) so the key-based remount
// on route change is actually exercised — a mocked router can't reproduce the
// shared-fiber bug this guards against.

vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    rating: [],
    name: 'Pasta 5',
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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RecipeEditorRoute · remount on route change', () => {
  it('resets to a blank new-recipe form when navigating edit -> new', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'createRecipe').mockResolvedValue(recipe())

    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/recipes/5/edit']}>
          <Link to="/recipes/new">go new</Link>
          <Routes>
            <Route path="/recipes/new" element={<RecipeEditorRoute />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    )

    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Pasta 5'))

    fireEvent.click(screen.getByText('go new'))

    // Without the remount key the stale draft (recipe 5) would linger, and
    // autosave would PUT updateRecipe(5, ...) while the header says "Neues Rezept".
    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe(''))
    expect(screen.getByRole('button', { name: 'Anlegen' })).toBeTruthy()
  })
})

// "Fertig" must not navigate while a PUT is outstanding: the detail page GETs on
// mount, and a GET that beats the PUT would show the old recipe (#69). The fake
// server below only changes when the deferred PUT resolves, while GET answers at
// once — the REST ordering that exposed the bug.
describe('RecipeEditorRoute · Fertig waits for the save', () => {
  function server() {
    let current = recipe()
    const puts: { title: string; resolve: () => void; reject: (e: Error) => void }[] = []
    const getRecipe = vi.spyOn(foodly, 'getRecipe').mockImplementation(async () => current)
    const updateRecipe = vi.spyOn(foodly, 'updateRecipe').mockImplementation(
      (_id, body) =>
        new Promise((resolve, reject) => {
          puts.push({
            title: body.name,
            resolve: () => {
              current = { ...current, name: body.name }
              resolve(current)
            },
            reject,
          })
        }),
    )
    return { getRecipe, updateRecipe, puts }
  }

  function DetailStub() {
    const [name, setName] = useState<string | null>(null)
    useEffect(() => {
      foodly.getRecipe(5).then((r) => setName(r.name))
    }, [])
    return <p>Detail: {name ?? '…'}</p>
  }

  function renderEditor() {
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/recipes/5/edit']}>
          <Link to="/recipes">elsewhere</Link>
          <Routes>
            <Route path="/recipes" element={<p>List</p>} />
            <Route path="/recipes/:id" element={<DetailStub />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    )
  }

  const titleInput = () => screen.getByLabelText('Titel') as HTMLInputElement
  const fertig = () => screen.getByRole('button', { name: 'Fertig' }) as HTMLButtonElement

  async function openAndRename(title: string) {
    await waitFor(() => expect(titleInput().value).toBe('Pasta 5'))
    fireEvent.change(titleInput(), { target: { value: title } })
  }

  it('navigates only after the PUT landed, so the detail shows the new title', async () => {
    const { getRecipe, updateRecipe, puts } = server()
    renderEditor()
    await openAndRename('Pasta neu')

    fireEvent.click(fertig()) // well within the 800 ms debounce

    await waitFor(() => expect(updateRecipe).toHaveBeenCalledTimes(1))
    expect(puts[0].title).toBe('Pasta neu')
    expect(fertig().disabled).toBe(true)
    expect(fertig().getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByText(/Detail:/)).toBeNull()
    expect(getRecipe).toHaveBeenCalledTimes(1) // only the editor's own load

    act(() => puts[0].resolve())

    expect(await screen.findByText('Detail: Pasta neu')).toBeTruthy()
    expect(updateRecipe).toHaveBeenCalledTimes(1) // no extra PUT from the unmount flush
  })

  it('also waits for the follow-up save queued behind a running one', async () => {
    const { updateRecipe, puts } = server()
    renderEditor()
    await openAndRename('Pasta 1')
    await waitFor(() => expect(updateRecipe).toHaveBeenCalledTimes(1), { timeout: 2000 }) // debounce fired

    fireEvent.change(titleInput(), { target: { value: 'Pasta 2' } })
    fireEvent.click(fertig())

    act(() => puts[0].resolve())
    await waitFor(() => expect(updateRecipe).toHaveBeenCalledTimes(2))
    expect(puts[1].title).toBe('Pasta 2')
    expect(screen.queryByText(/Detail:/)).toBeNull()

    act(() => puts[1].resolve())

    expect(await screen.findByText('Detail: Pasta 2')).toBeTruthy()
  })

  it('stays in the editor with a retry when the save fails, and Fertig again retries', async () => {
    const { puts } = server()
    renderEditor()
    await openAndRename('Pasta neu')

    fireEvent.click(fertig())
    await waitFor(() => expect(puts).toHaveLength(1))
    act(() => puts[0].reject(new Error('offline')))

    expect(await screen.findByText('Nicht gespeichert')).toBeTruthy()
    expect(screen.getByText('Erneut versuchen')).toBeTruthy()
    await waitFor(() => expect(fertig().disabled).toBe(false))
    expect(screen.queryByText(/Detail:/)).toBeNull()

    fireEvent.click(fertig())
    await waitFor(() => expect(puts).toHaveLength(2))
    act(() => puts[1].resolve())

    expect(await screen.findByText('Detail: Pasta neu')).toBeTruthy()
  })

  it('navigates straight away without unsaved changes', async () => {
    const { updateRecipe } = server()
    renderEditor()
    await waitFor(() => expect(titleInput().value).toBe('Pasta 5'))

    fireEvent.click(fertig())

    expect(await screen.findByText('Detail: Pasta 5')).toBeTruthy()
    expect(updateRecipe).not.toHaveBeenCalled()
  })

  it('does not pull the user back when they left while Fertig was waiting', async () => {
    const { puts } = server()
    renderEditor()
    await openAndRename('Pasta neu')

    fireEvent.click(fertig())
    await waitFor(() => expect(puts).toHaveLength(1))
    fireEvent.click(screen.getByText('elsewhere'))
    expect(await screen.findByText('List')).toBeTruthy()

    act(() => puts[0].resolve())
    await act(async () => {})

    expect(puts).toHaveLength(1) // the unmount flush doesn't re-send the value in flight
    expect(screen.getByText('List')).toBeTruthy()
    expect(screen.queryByText(/Detail:/)).toBeNull()
  })
})
