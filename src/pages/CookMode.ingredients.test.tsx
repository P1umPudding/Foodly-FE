import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CookMode } from './CookMode'
import { foodly } from '../api'
import { TimerProvider } from '../timers/TimerProvider'
import { setViewport } from '../test/viewport'
import type { Recipe, RecipeIngredient, Section } from '../api/protocol'

vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

function ing(id: number, text: string, amount: string | null, unit: string | null = null): RecipeIngredient {
  return { id, ingredient: null, text, amount, amountPrefix: null, unit }
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
    sizeText: 'Portionen',
    notes: [],
    mainImage: null,
    images: [],
    sections,
    ...over,
  }
}

const SECTIONS: Section[] = [
  { id: 1, name: 'Soße', steps: ['Zwiebeln hacken', 'Anbraten'], ingredients: [ing(11, 'Tomaten', '200', 'g')] },
  { id: 2, name: 'Teig', steps: ['Mehl sieben'], ingredients: [ing(21, 'Mehl', '100', 'g'), ing(22, 'Salz', null)] },
  { id: 3, name: 'Anrichten', steps: ['Servieren'], ingredients: [] },
]

function Probe() {
  const { pathname, search } = useLocation()
  return (
    <p data-testid="location" data-navigation={useNavigationType()}>
      {pathname + search}
    </p>
  )
}

function renderCook(cookPath = '/recipes/5/cook', entries: string[] = [], data = recipe(SECTIONS)) {
  vi.spyOn(foodly, 'getRecipe').mockResolvedValue(data)
  return render(
    <TooltipProvider>
      <MemoryRouter useTransitions={false} initialEntries={[...entries, cookPath]} initialIndex={entries.length}>
        <TimerProvider userId={1}>
          <Routes>
            <Route path="/recipes/:id/cook" element={<CookMode />} />
            <Route path="*" element={null} />
          </Routes>
          <Probe />
        </TimerProvider>
      </MemoryRouter>
    </TooltipProvider>,
  )
}

const ready = () => screen.findByText('Zwiebeln hacken')
const column = () => screen.getByRole('complementary', { name: 'Zutaten' })
const need = () => screen.queryByRole('list', { name: 'Dafür' })
const location = () => screen.getByTestId('location')
const next = () => screen.getByRole('button', { name: /Weiter/ })
const subtitle = () => screen.getByText(/Schritt \d+ von \d+$/).textContent

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  setViewport(1024)
})

describe('CookMode ingredients', () => {
  it('shows the column from 1024 px with all sections, without the „Zutaten“ button', async () => {
    renderCook()
    await ready()
    const aside = column()
    expect(within(aside).getByRole('heading', { name: 'Zutaten · Soße', level: 2 })).toBeTruthy()
    expect(within(aside).getByRole('heading', { name: 'Zutaten · Teig', level: 2 })).toBeTruthy()
    // A section without ingredients gets no group.
    expect(within(aside).queryByRole('heading', { name: /Anrichten/ })).toBeNull()
    expect(
      within(aside)
        .getAllByRole('checkbox')
        .map((c) => c.getAttribute('aria-label')),
    ).toEqual(['Tomaten', 'Mehl', 'Salz'])
    expect(within(aside).getByLabelText('Portionen')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Zutaten' })).toBeNull()
  })

  it('below 1024 px offers „Zutaten“ in the header, which opens the same content in a sheet', async () => {
    setViewport(1023)
    renderCook()
    await ready()
    expect(screen.queryByRole('complementary', { name: 'Zutaten' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Zutaten' }))
    const sheet = await screen.findByRole('dialog', { name: 'Zutaten' })
    expect(within(sheet).getByLabelText('Portionen')).toBeTruthy()
    expect(within(sheet).getAllByRole('checkbox')).toHaveLength(3)
    expect(within(sheet).getByRole('heading', { name: 'Zutaten · Teig', level: 3 })).toBeTruthy()
  })

  it('names no group in the sheet for a single unnamed section', async () => {
    setViewport(800)
    renderCook('/recipes/5/cook', [], recipe([{ ...SECTIONS[0], name: null }]))
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Zutaten' }))
    const sheet = await screen.findByRole('dialog', { name: 'Zutaten' })
    expect(within(sheet).queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('offers neither column nor button for a recipe without ingredients', async () => {
    renderCook('/recipes/5/cook', [], recipe([{ ...SECTIONS[2], steps: ['Zwiebeln hacken'] }]))
    await ready()
    expect(screen.queryByRole('complementary')).toBeNull()
    setViewport(1023)
    expect(screen.queryByRole('button', { name: 'Zutaten' })).toBeNull()
  })

  it('scales column and „Dafür“ by ?servings, and the stepper writes the URL with replace', async () => {
    renderCook('/recipes/5/cook?servings=8')
    await ready()
    expect(within(column()).getByText('400 g')).toBeTruthy()
    expect(need()!.textContent).toBe('400 g Tomaten')

    fireEvent.click(within(column()).getByRole('button', { name: 'Mehr' }))
    expect(location().textContent).toBe('/recipes/5/cook?servings=9')
    expect(location().dataset.navigation).toBe('REPLACE')
    expect(need()!.textContent).toBe('450 g Tomaten')
  })

  it('shows the section’s ingredients as „Dafür“ chips, ticked ones dimmed, none in a section without', async () => {
    renderCook()
    await ready()
    expect(
      within(need()!)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['200 g Tomaten'])

    fireEvent.click(next())
    fireEvent.click(next())
    expect(subtitle()).toBe('Teig · Schritt 3 von 4')
    fireEvent.click(within(column()).getByRole('checkbox', { name: 'Mehl' }))
    const [mehl, salz] = within(need()!).getAllByRole('listitem')
    expect(mehl.textContent).toBe('100 g Mehl (abgehakt)')
    expect(mehl.className).toContain('line-through')
    expect(salz.className).not.toContain('line-through')

    fireEvent.click(next())
    expect(subtitle()).toBe('Anrichten · Schritt 4 von 4')
    expect(need()).toBeNull()
  })

  it('ticks without Web Storage', async () => {
    // From before the first render: the store must not read ticks on mount either. The timers keep their own keys.
    const storage = [
      vi.spyOn(Storage.prototype, 'getItem'),
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'removeItem'),
    ]
    renderCook()
    await ready()
    const tomaten = within(column()).getByRole('checkbox', { name: 'Tomaten' }) as HTMLInputElement
    fireEvent.click(tomaten)
    expect(tomaten.checked).toBe(true)
    fireEvent.click(tomaten)
    expect(tomaten.checked).toBe(false)
    const keys = storage.flatMap((spy) => spy.mock.calls.map((call) => String(call[0])))
    expect(keys.filter((key) => !key.startsWith('foodly.timers'))).toEqual([])
  })

  it('scales a fixed-size recipe by ?factor, and the stepper writes ?factor', async () => {
    renderCook('/recipes/5/cook?factor=2', [], recipe(SECTIONS, { sizeNumber: null, sizeText: 'Blech' }))
    await ready()
    expect(within(column()).getByText('400 g')).toBeTruthy()
    expect(need()!.textContent).toBe('400 g Tomaten')
    fireEvent.click(within(column()).getByRole('button', { name: 'Weniger' }))
    expect(location().textContent).toBe('/recipes/5/cook?factor=1.5')
    expect(location().dataset.navigation).toBe('REPLACE')
    expect(need()!.textContent).toBe('300 g Tomaten')
  })

  it('keeps the arrow keys working on a ticked checkbox', async () => {
    renderCook()
    await ready()
    const tomaten = within(column()).getByRole('checkbox', { name: 'Tomaten' })
    tomaten.focus()
    fireEvent.click(tomaten)
    fireEvent.keyDown(tomaten, { key: 'ArrowRight' })
    expect(subtitle()).toBe('Soße · Schritt 2 von 4')
  })

  it('rests the arrow keys while the sheet is open, and again pages once the window grows past it', async () => {
    setViewport(1023)
    renderCook()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Zutaten' }))
    await screen.findByRole('dialog', { name: 'Zutaten' })
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(subtitle()).toBe('Soße · Schritt 1 von 4')

    setViewport(1024)
    expect(screen.queryByRole('dialog')).toBeNull()
    // The sheet's trigger is gone; focus goes to the column instead of the page.
    await waitFor(() => expect(column().contains(document.activeElement)).toBe(true))
    // Radix returns focus from a closed sheet in a timeout; it must not take it away again.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(document.activeElement).toBe(within(column()).getByRole('checkbox', { name: 'Tomaten' }))
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(subtitle()).toBe('Soße · Schritt 2 von 4')
  })

  it('leaves focus alone when the window grows with the sheet closed', async () => {
    setViewport(1023)
    renderCook()
    await ready()
    next().focus()
    setViewport(1024)
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(document.activeElement).toBe(next())
  })

  describe('leaving with a changed size', () => {
    it('opens the recipe with the new size instead of going back, replacing cook mode', async () => {
      renderCook('/recipes/5/cook?servings=4', ['/recipes/5?servings=4'])
      await ready()
      fireEvent.click(within(column()).getByRole('button', { name: 'Mehr' }))
      fireEvent.click(screen.getByRole('button', { name: 'Koch-Modus beenden' }))
      expect(location().textContent).toBe('/recipes/5?servings=5')
      expect(location().dataset.navigation).toBe('REPLACE')
    })

    it('still goes back when the size is the one it arrived with', async () => {
      renderCook('/recipes/5/cook?servings=4', ['/recipes?q=x'])
      await ready()
      fireEvent.click(within(column()).getByRole('button', { name: 'Mehr' }))
      fireEvent.click(within(column()).getByRole('button', { name: 'Weniger' }))
      fireEvent.click(screen.getByRole('button', { name: 'Koch-Modus beenden' }))
      expect(location().textContent).toBe('/recipes?q=x')
      expect(location().dataset.navigation).toBe('POP')
    })
  })
})
