import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Button, TooltipProvider, toast } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CookMode } from './CookMode'
import { foodly } from '../api'
import { AppToaster } from '../components/shell/AppToaster'
import { BareLayout } from '../components/shell/BareLayout'
import { TimerProvider, useTimers } from '../timers/TimerProvider'
import type { Recipe, Section } from '../api/protocol'

let currentUserId = 1
vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => currentUserId,
}))

function section(id: number, name: string | null, steps: string[]): Section {
  return { id, name, ingredients: [], steps }
}

function recipe(sections: Section[], over: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    name: 'Lasagne',
    tags: [],
    source: null,
    rating: [],
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: 4,
    sizeText: null,
    notes: [],
    mainImage: null,
    images: [],
    sections,
    ...over,
  }
}

const TWO_SECTIONS = [
  section(1, 'Soße', ['Zwiebeln hacken', 'Anbraten', '20 Minuten köcheln']),
  section(2, 'Teig', ['Mehl sieben', 'Kneten']),
]

function Probe() {
  const { pathname, search } = useLocation()
  return <p data-testid="location">{pathname + search}</p>
}

function TimerLabels() {
  const { timers } = useTimers()
  return <p data-testid="timers">{timers.map((t) => t.label).join('|')}</p>
}

// `entries`: the history before cook mode, if any; the last entry is the cook page.
function renderCook(cookPath = '/recipes/5/cook', entries: string[] = []) {
  return render(
    <TooltipProvider>
      <MemoryRouter initialEntries={[...entries, cookPath]} initialIndex={entries.length}>
        <TimerProvider userId={1}>
          <Routes>
            <Route element={<BareLayout />}>
              <Route path="/recipes/:id/cook" element={<CookMode />} />
            </Route>
            <Route path="*" element={<Probe />} />
          </Routes>
          <TimerLabels />
          <AppToaster />
        </TimerProvider>
      </MemoryRouter>
    </TooltipProvider>,
  )
}

const location = () => screen.getByTestId('location').textContent
const subtitle = () => screen.getByText(/Schritt \d+ von \d+/).textContent
const next = () => screen.getByRole('button', { name: /Weiter/ })
const back = () => screen.getByRole('button', { name: 'Zurück' })

beforeEach(() => {
  currentUserId = 1
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.title = ''
})

describe('CookMode', () => {
  it('counts steps across sections and names the section', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    renderCook()
    expect(await screen.findByText('Zwiebeln hacken')).toBeTruthy()
    expect(subtitle()).toBe('Soße · Schritt 1 von 5')
    fireEvent.click(next())
    fireEvent.click(next())
    // Step 3: "Danach" announces the second section.
    expect(screen.getByText('Danach').parentElement?.textContent).toBe('DanachTeig · Mehl sieben')
    fireEvent.click(next())
    expect(subtitle()).toBe('Teig · Schritt 4 von 5')
    expect(screen.getByRole('progressbar', { name: 'Fortschritt' }).getAttribute('aria-valuenow')).toBe('4')
  })

  it('pages with the buttons and the arrow keys; Zurück is disabled first, Fertig replaces Weiter last', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    renderCook()
    await screen.findByText('Zwiebeln hacken')
    expect((back() as HTMLButtonElement).disabled).toBe(true)

    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(subtitle()).toContain('Schritt 2 von 5')
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(subtitle()).toContain('Schritt 1 von 5')
    // Not below the first step.
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(subtitle()).toContain('Schritt 1 von 5')

    for (let i = 0; i < 4; i++) fireEvent.click(next())
    expect(subtitle()).toContain('Schritt 5 von 5')
    expect(screen.queryByRole('button', { name: /Weiter/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Fertig' })).toBeTruthy()
    expect(screen.queryByText('Danach')).toBeNull()
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(subtitle()).toContain('Schritt 5 von 5')

    fireEvent.click(back())
    expect(subtitle()).toContain('Schritt 4 von 5')
  })

  it('ignores the keys while typing and with a modifier', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    renderCook('/recipes/5/cook', ['/recipes/5'])
    await screen.findByText('Zwiebeln hacken')
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    fireEvent.keyDown(input, { key: 'Escape' })
    fireEvent.keyDown(document.body, { key: 'ArrowRight', altKey: true })
    expect(subtitle()).toContain('Schritt 1 von 5')
    expect(screen.queryByTestId('location')).toBeNull()
    input.remove()
  })

  it('leaves Escape to the open timer panel', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    renderCook('/recipes/5/cook', ['/recipes/5'])
    await screen.findByText('Zwiebeln hacken')
    fireEvent.click(screen.getByRole('button', { name: 'Timer' }))
    await screen.findByRole('dialog', { name: 'Timer' })
    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Timer' })).toBeNull())
    expect(screen.queryByTestId('location')).toBeNull()
  })

  describe('leaving', () => {
    const leave = {
      Escape: () => fireEvent.keyDown(document.body, { key: 'Escape' }),
      '✕': () => fireEvent.click(screen.getByRole('button', { name: 'Koch-Modus beenden' })),
      Fertig: () => {
        for (let i = 0; i < 4; i++) fireEvent.click(next())
        fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
      },
    }

    it.each(Object.keys(leave) as Array<keyof typeof leave>)('%s goes back with in-app history', async (way) => {
      vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
      renderCook('/recipes/5/cook?servings=4', ['/recipes?q=x'])
      await screen.findByText('Zwiebeln hacken')
      leave[way]()
      expect(location()).toBe('/recipes?q=x')
    })

    it.each(Object.keys(leave) as Array<keyof typeof leave>)(
      '%s opens the recipe with its size without history',
      async (way) => {
        vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
        renderCook('/recipes/5/cook?servings=4&foo=1')
        await screen.findByText('Zwiebeln hacken')
        leave[way]()
        expect(location()).toBe('/recipes/5?servings=4')
      },
    )
  })

  it('starts a timer labelled with the recipe and step from a time chip, next to a visible timer button', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    renderCook()
    await screen.findByText('Zwiebeln hacken')
    expect(screen.getByRole('button', { name: 'Timer' })).toBeTruthy()
    fireEvent.click(next())
    fireEvent.click(next())
    fireEvent.click(screen.getByRole('button', { name: /^Timer starten/ }))
    expect(screen.getByTestId('timers').textContent).toBe('Lasagne · Schritt 3')
  })

  it('shows "x / y" instead of dots above 12 steps', async () => {
    const steps = Array.from({ length: 13 }, (_, i) => `Schritt-Text ${i + 1}`)
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe([section(1, null, steps)]))
    renderCook()
    await screen.findByText('Schritt-Text 1')
    expect(screen.getByText('1 / 13')).toBeTruthy()
    expect(screen.queryByTestId('step-dots')).toBeNull()
    // A single section has no name in the subtitle.
    expect(subtitle()).toBe('Schritt 1 von 13')
  })

  it('shows dots up to 12 steps', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    renderCook()
    await screen.findByText('Zwiebeln hacken')
    expect(screen.getByTestId('step-dots').children).toHaveLength(5)
    expect(screen.queryByText('1 / 5')).toBeNull()
  })

  it('names the page after the recipe', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    renderCook()
    await screen.findByText('Zwiebeln hacken')
    expect(document.title).toBe('Kochen: Lasagne · Foodly')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Lasagne')
  })

  it('shows a step skeleton while loading', () => {
    vi.spyOn(foodly, 'getRecipe').mockReturnValue(new Promise(() => {}))
    renderCook()
    expect(screen.getByTestId('cook-skeleton')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Koch-Modus beenden' })).toBeTruthy()
  })

  it('offers a retry and the way to the recipe on an error', async () => {
    const getRecipe = vi.spyOn(foodly, 'getRecipe').mockRejectedValueOnce(new Error('boom'))
    renderCook('/recipes/5/cook?factor=2')
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('link', { name: 'Zum Rezept' }).getAttribute('href')).toBe('/recipes/5?factor=2')
    getRecipe.mockResolvedValue(recipe(TWO_SECTIONS))
    fireEvent.click(within(alert).getByRole('button', { name: 'Erneut versuchen' }))
    expect(await screen.findByText('Zwiebeln hacken')).toBeTruthy()
  })

  it('shows an empty state without steps, without bar and footer', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe([section(1, 'A', [])]))
    renderCook()
    expect(await screen.findByText('Dieses Rezept hat noch keine Schritte.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Zum Rezept' }).getAttribute('href')).toBe('/recipes/5')
    expect(screen.getByRole('link', { name: 'Bearbeiten' }).getAttribute('href')).toBe('/recipes/5/edit')
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByRole('button', { name: /Weiter/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Zurück' })).toBeNull()
  })

  it('offers no "Bearbeiten" to a viewer', async () => {
    currentUserId = 2
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe([]))
    renderCook()
    await screen.findByText('Dieses Rezept hat noch keine Schritte.')
    expect(screen.queryByRole('link', { name: 'Bearbeiten' })).toBeNull()
  })

  it('keeps a toast across the way into cook mode', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/recipes/5']}>
          <TimerProvider userId={1}>
            <Routes>
              <Route element={<BareLayout />}>
                <Route path="/recipes/:id/cook" element={<CookMode />} />
              </Route>
              <Route path="*" element={<CookLink />} />
            </Routes>
            <AppToaster />
          </TimerProvider>
        </MemoryRouter>
      </TooltipProvider>,
    )
    act(() => {
      toast('Timer „Nudeln“ abgelaufen', { duration: Infinity })
    })
    expect(await screen.findByText('Timer „Nudeln“ abgelaufen')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'cook' }))
    await screen.findByText('Zwiebeln hacken')
    expect(screen.getByText('Timer „Nudeln“ abgelaufen')).toBeTruthy()
    act(() => {
      toast.dismiss()
    })
  })
})

function CookLink() {
  const navigate = useNavigate()
  return <Button onClick={() => navigate('/recipes/5/cook')}>cook</Button>
}

describe('CookMode wake lock', () => {
  const release = vi.fn(() => Promise.resolve())
  const request = vi.fn(() => Promise.resolve({ release }))

  beforeEach(() => {
    release.mockClear()
    request.mockClear()
    // Before render: useWakeLock reads `'wakeLock' in navigator` while rendering.
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock')
  })

  it('takes the lock on opening and releases it on leaving', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    const { unmount } = renderCook()
    await screen.findByText('Zwiebeln hacken')
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))
    expect(release).not.toHaveBeenCalled()
    unmount()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('releases the lock with the switch', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    renderCook()
    await screen.findByText('Zwiebeln hacken')
    await waitFor(() => expect(request).toHaveBeenCalled())
    const toggle = screen.getByRole('button', { name: 'Bildschirm anlassen' })
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(toggle)
    expect(release).toHaveBeenCalledTimes(1)
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
  })
})

describe('CookMode without the Wake Lock API', () => {
  it('hides the switch', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(TWO_SECTIONS))
    renderCook()
    await screen.findByText('Zwiebeln hacken')
    expect(screen.queryByRole('button', { name: 'Bildschirm anlassen' })).toBeNull()
  })
})
