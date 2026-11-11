import { useEffect, useState, type ComponentProps } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Button, TooltipProvider, toast } from '@postxl/ui-components'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditorRoute } from '../App'
import { foodly } from '../api'
import { allPendingSaves, resetPendingSaves } from '../api/pendingSaves'
import type { Recipe } from '../api/protocol'

// The mode is read when the modules load, so pin REST before the imports run (vi.hoisted),
// whatever the shell env or .env.local sets.
vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))

// Real react-router here (unlike RecipeEditor.test.tsx) so the key-based remount
// on route change is actually exercised — a mocked router can't reproduce the
// shared-fiber bug this guards against.

vi.mock('../catalog/CatalogProvider', () => ({
  useRefreshCategories: () => () => {},
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
  window.history.replaceState(null, '', '/')
  // Tests that leave a PUT unsettled would otherwise make a later read of recipe 5 wait.
  resetPendingSaves()
})

afterAll(() => vi.unstubAllEnvs())

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
      void foodly.getRecipe(5).then((r) => setName(r.name))
    }, [])
    return <p>Detail: {name ?? '…'}</p>
  }

  // Every navigation gets a fresh location key, so this records each one — even
  // a repeated push of the same path.
  const visits: string[] = []
  function VisitLog() {
    const location = useLocation()
    useEffect(() => {
      visits.push(location.pathname)
    }, [location.key])
    return null
  }

  function renderEditor(
    entries: NonNullable<ComponentProps<typeof MemoryRouter>['initialEntries']> = ['/recipes/5/edit'],
  ) {
    visits.length = 0
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
          <VisitLog />
          <Link to="/recipes">elsewhere</Link>
          <HistoryBack />
          <Routes>
            <Route path="/recipes" element={<p>List</p>} />
            <Route path="/recipes/:id" element={<DetailStub />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    )
  }

  function HistoryBack() {
    const navigate = useNavigate()
    return <Button onClick={() => navigate(-1)}>history-back</Button>
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
    expect(fertig().getAttribute('aria-disabled')).toBe('true')
    expect(fertig().getAttribute('aria-busy')).toBe('true')
    // Not `disabled`: browsers drop focus to <body> from a disabled button (jsdom doesn't, hence this check).
    expect(fertig().disabled).toBe(false)
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

    fertig().focus()
    fireEvent.click(fertig())
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(document.activeElement).toBe(fertig())
    act(() => puts[0].reject(new Error('offline')))

    expect(await screen.findByText('Nicht gespeichert')).toBeTruthy()
    expect(screen.getByText('Erneut versuchen')).toBeTruthy()
    await waitFor(() => expect(fertig().getAttribute('aria-disabled')).toBe('false'))
    expect(document.activeElement).toBe(fertig()) // focus stays on Fertig through wait and failure
    expect(screen.queryByText(/Detail:/)).toBeNull()

    fireEvent.click(fertig())
    await waitFor(() => expect(puts).toHaveLength(2))
    act(() => puts[1].resolve())

    expect(await screen.findByText('Detail: Pasta neu')).toBeTruthy()
  })

  it('ignores repeated clicks while waiting', async () => {
    const { updateRecipe, puts } = server()
    renderEditor()
    await openAndRename('Pasta neu')

    fireEvent.click(fertig())
    await waitFor(() => expect(puts).toHaveLength(1))
    fireEvent.click(fertig())
    fireEvent.click(fertig())

    act(() => puts[0].resolve())

    expect(await screen.findByText('Detail: Pasta neu')).toBeTruthy()
    await act(async () => {})
    expect(updateRecipe).toHaveBeenCalledTimes(1)
    expect(visits).toEqual(['/recipes/5/edit', '/recipes/5']) // navigated once, not three times
  })

  it('navigates straight away without unsaved changes', async () => {
    const { updateRecipe } = server()
    renderEditor()
    await waitFor(() => expect(titleInput().value).toBe('Pasta 5'))

    fireEvent.click(fertig())

    expect(await screen.findByText('Detail: Pasta 5')).toBeTruthy()
    expect(updateRecipe).not.toHaveBeenCalled()
  })

  // Detail "Zurück" walks back through history (#132): Fertig must not leave the editor behind the detail page.
  it('opened from the detail page, Fertig goes back to it after the save, so Back then reaches the list', async () => {
    const { puts } = server()
    renderEditor(['/recipes', '/recipes/5', { pathname: '/recipes/5/edit', state: { fromDetail: true } }])
    await openAndRename('Pasta neu')

    fireEvent.click(fertig())
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(screen.queryByText(/Detail:/)).toBeNull()
    act(() => puts[0].resolve())
    expect(await screen.findByText('Detail: Pasta neu')).toBeTruthy()

    fireEvent.click(screen.getByText('history-back'))
    expect(await screen.findByText('List')).toBeTruthy()
  })

  it('opened another way, Fertig replaces the editor with the detail page', async () => {
    server()
    renderEditor(['/recipes', '/recipes/5/edit'])
    await waitFor(() => expect(titleInput().value).toBe('Pasta 5'))

    fireEvent.click(fertig())
    expect(await screen.findByText('Detail: Pasta 5')).toBeTruthy()

    fireEvent.click(screen.getByText('history-back'))
    expect(await screen.findByText('List')).toBeTruthy()
    expect(screen.queryByLabelText('Titel')).toBeNull()
  })

  it('opened from the detail page but first in history, Fertig replaces instead of leaving the app', async () => {
    server()
    window.history.replaceState({ usr: { fromDetail: true }, key: 'edit', idx: 0 }, '', '/recipes/5/edit')
    const go = vi.spyOn(window.history, 'go')
    render(
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/recipes/:id" element={<DetailStub />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>,
    )
    await waitFor(() => expect(titleInput().value).toBe('Pasta 5'))

    fireEvent.click(fertig())

    expect(await screen.findByText('Detail: Pasta 5')).toBeTruthy()
    expect(go).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/recipes/5')
  })

  it('a repeated Fertig while going back does not step back twice (browser history)', async () => {
    server()
    window.history.replaceState({ usr: { fromDetail: true }, key: 'edit', idx: 2 }, '', '/recipes/5/edit')
    // In a browser the editor unmounts only on the later popstate; holding that back opens the window for a repeat.
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {})
    render(
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>,
    )
    await waitFor(() => expect(titleInput().value).toBe('Pasta 5'))

    fireEvent.click(fertig())
    await waitFor(() => expect(go).toHaveBeenCalledWith(-1))
    fireEvent.click(fertig())
    await act(async () => {})

    expect(go).toHaveBeenCalledTimes(1)
    expect(fertig().getAttribute('aria-busy')).toBe('true')
  })

  it('does not pull the user back when they left while Fertig was waiting', async () => {
    const { puts } = server()
    renderEditor()
    await openAndRename('Pasta neu')

    fireEvent.click(fertig())
    await waitFor(() => expect(puts).toHaveLength(1))
    fireEvent.click(screen.getByText('elsewhere'))
    expect(await screen.findByText('List')).toBeTruthy()

    await act(async () => {
      puts[0].resolve()
      // Let the whole save -> flush -> finish() continuation chain run.
      for (let i = 0; i < 10; i++) await Promise.resolve()
    })

    expect(puts).toHaveLength(1) // the unmount flush doesn't re-send the value in flight
    expect(screen.getByText('List')).toBeTruthy()
    expect(screen.queryByText(/Detail:/)).toBeNull()
  })
})

// Leaving without "Fertig" doesn't wait for the save; the next page's read waits
// instead (#80). getRecipe is NOT spied here: the wait lives inside it, so the GET
// goes through the real foodly.getRecipe to a fetch fake that answers at once.
describe('RecipeEditorRoute · leaving another way', () => {
  function server() {
    let current = recipe()
    const puts: { resolve: () => void; reject: (e: Error) => void }[] = []
    const gets: string[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      gets.push(String(input))
      return { ok: true, status: 200, json: async () => current } as unknown as Response
    })
    vi.spyOn(foodly, 'updateRecipe').mockImplementation(
      (_id, body) =>
        new Promise((resolve, reject) => {
          puts.push({
            resolve: () => {
              current = { ...current, name: body.name }
              resolve(current)
            },
            reject,
          })
        }),
    )
    return { puts, gets }
  }

  function DetailStub() {
    const [name, setName] = useState<string | null>(null)
    useEffect(() => {
      void foodly.getRecipe(5).then((r) => setName(r.name))
    }, [])
    return <p>Detail: {name ?? '…'}</p>
  }

  function renderEditor(path = '/recipes/5/edit') {
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <Link to="/recipes/5">to detail</Link>
          <Link to="/recipes/5/edit">to editor</Link>
          <Routes>
            <Route path="/recipes/:id" element={<DetailStub />} />
            <Route path="/recipes/new" element={<RecipeEditorRoute />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    )
  }

  const titleInput = () => screen.getByLabelText('Titel') as HTMLInputElement

  async function openAndRename(title: string) {
    await waitFor(() => expect(titleInput().value).toBe('Pasta 5'))
    fireEvent.change(titleInput(), { target: { value: title } })
  }

  it('holds the detail GET until the unmount PUT landed, so it shows the new title', async () => {
    const { puts, gets } = server()
    renderEditor()
    await openAndRename('Pasta neu')
    const loadsBefore = gets.length // the editor's own load

    fireEvent.click(screen.getByText('to detail')) // well within the 800 ms debounce
    expect(await screen.findByText('Detail: …')).toBeTruthy()
    expect(puts).toHaveLength(1)
    await act(async () => {})
    expect(gets).toHaveLength(loadsBefore)

    act(() => puts[0].resolve())

    expect(await screen.findByText('Detail: Pasta neu')).toBeTruthy()
    expect(gets).toHaveLength(loadsBefore + 1)
  })

  it('shows the server state after a failed unmount PUT', async () => {
    const { puts } = server()
    renderEditor()
    await openAndRename('Pasta neu')

    fireEvent.click(screen.getByText('to detail'))
    await waitFor(() => expect(puts).toHaveLength(1))
    act(() => puts[0].reject(new Error('offline')))

    expect(await screen.findByText('Detail: Pasta 5')).toBeTruthy()
  })

  it('reopening the editor while the save is pending loads the saved state, not the old one', async () => {
    const { puts } = server()
    renderEditor()
    await openAndRename('Pasta neu')

    fireEvent.click(screen.getByText('to detail'))
    await waitFor(() => expect(puts).toHaveLength(1))
    fireEvent.click(screen.getByText('to editor'))
    await act(async () => {})
    // Still loading: an old draft here would become the autosave baseline and overwrite the edit.
    expect(screen.queryByLabelText('Titel')).toBeNull()

    act(() => puts[0].resolve())

    await waitFor(() => expect(titleInput().value).toBe('Pasta neu'))
  })

  it('registers nothing when leaving a new, not yet created recipe', async () => {
    server()
    renderEditor('/recipes/new')
    fireEvent.change(titleInput(), { target: { value: 'Entwurf' } })

    fireEvent.click(screen.getByText('to detail'))

    expect(allPendingSaves()).toBeNull()
    expect(await screen.findByText('Detail: Pasta 5')).toBeTruthy()
  })
})

// Leaving while the POST of a new recipe runs: the recipe is still created, but the user stays where they went (#132).
describe('RecipeEditorRoute · Anlegen', () => {
  function deferredCreate() {
    const pending: { resolve: (r: Recipe) => void; reject: (e: Error) => void }[] = []
    const createRecipe = vi.spyOn(foodly, 'createRecipe').mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          pending.push({ resolve, reject })
        }),
    )
    vi.spyOn(foodly, 'getRecipe').mockImplementation(async (id) => recipe({ id, name: 'Neu' }))
    vi.spyOn(foodly, 'updateRecipe').mockImplementation(async (id) => recipe({ id, name: 'Neu' }))
    return { createRecipe, pending }
  }

  function renderNew() {
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/recipes/new']}>
          <Link to="/elsewhere">elsewhere</Link>
          <Routes>
            <Route path="/elsewhere" element={<p>Elsewhere</p>} />
            <Route path="/recipes" element={<p>List</p>} />
            <Route path="/recipes/new" element={<RecipeEditorRoute />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    )
  }

  const titleInput = () => screen.getByLabelText('Titel') as HTMLInputElement
  const anlegen = () => screen.getByRole('button', { name: 'Anlegen' })
  const verwerfen = () => screen.getByRole('link', { name: 'Verwerfen' })

  async function startCreate() {
    fireEvent.change(titleInput(), { target: { value: 'Neu' } })
    fireEvent.click(anlegen())
    await waitFor(() => expect(anlegen().getAttribute('aria-busy')).toBe('true'))
  }

  it('locks the form while creating, then swaps to the edit route', async () => {
    const { createRecipe, pending } = deferredCreate()
    renderNew()
    await startCreate()

    // Via the fieldset: the controls' own `disabled` stays false, only :disabled reflects the lock.
    expect(titleInput().matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /abschnitt hinzufügen/i }).matches(':disabled')).toBe(true)
    expect(screen.getByLabelText('Bild hochladen').matches(':disabled')).toBe(true)
    expect(anlegen().getAttribute('aria-disabled')).toBe('true')
    expect(verwerfen().getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(verwerfen())
    fireEvent.click(anlegen())
    expect(createRecipe).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('List')).toBeNull()

    await act(async () => pending[0].resolve(recipe({ id: 42, name: 'Neu' })))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Anlegen' })).toBeNull())
    expect(screen.getByRole('button', { name: 'Fertig' })).toBeTruthy()
  })

  it('unlocks the form and shows the error when creating fails', async () => {
    const { pending } = deferredCreate()
    renderNew()
    await startCreate()

    await act(async () => pending[0].reject(new Error('Anlegen fehlgeschlagen')))

    expect(await screen.findByText('Anlegen fehlgeschlagen')).toBeTruthy()
    expect(titleInput().matches(':disabled')).toBe(false)
    expect(anlegen().getAttribute('aria-disabled')).toBe('false')
  })

  it('does not pull the user back when they left while creating', async () => {
    const { createRecipe, pending } = deferredCreate()
    const error = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    renderNew()
    await startCreate()

    fireEvent.click(screen.getByText('elsewhere'))
    expect(await screen.findByText('Elsewhere')).toBeTruthy()

    await act(async () => {
      pending[0].resolve(recipe({ id: 42, name: 'Neu' }))
      for (let i = 0; i < 10; i++) await Promise.resolve()
    })

    expect(createRecipe).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Elsewhere')).toBeTruthy()
    expect(screen.queryByLabelText('Titel')).toBeNull()
    expect(error).not.toHaveBeenCalled()
  })

  it('reports a failed create by toast when the user already left', async () => {
    const { pending } = deferredCreate()
    const error = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    renderNew()
    await startCreate()

    fireEvent.click(screen.getByText('elsewhere'))
    await screen.findByText('Elsewhere')
    await act(async () => pending[0].reject(new Error('Anlegen fehlgeschlagen')))

    expect(error).toHaveBeenCalledWith('Rezept konnte nicht angelegt werden.')
    expect(screen.getByText('Elsewhere')).toBeTruthy()
  })
})
