import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Rating } from './Rating'
import { foodly } from '../../api'
import type { Recipe } from '../../api/protocol'
import { setViewport } from '../../test/viewport'

const stubbed = vi.hoisted(() => ({ value: true }))
const currentUser = vi.hoisted(() => ({ id: 1 as number | null }))
vi.mock('../../api/stubs', () => ({ isStubbed: () => stubbed.value }))
vi.mock('../../api', () => ({ foodly: { setMyRating: vi.fn(), clearMyRating: vi.fn() } }))
vi.mock('../../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => currentUser.id,
  useUser: (id: number) => ({ id, name: `User ${id}`, profilePicture: null }),
}))

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    name: 'Base',
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
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
  stubbed.value = true
  currentUser.id = 1
})

function open(r: Recipe, onChange = vi.fn()) {
  render(<Rating recipe={r} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: /von 5|Bewerten/ }))
  return onChange
}

describe('Rating', () => {
  it('offers a first rating on an unrated recipe', () => {
    render(<Rating recipe={recipe()} />)
    expect(screen.getByText('Bewerten')).toBeTruthy()
  })

  it('sets the own rating and hands the updated recipe back', async () => {
    const updated = recipe({ rating: [{ user: 1, rating: 4 }] })
    vi.mocked(foodly.setMyRating).mockResolvedValue(updated)
    const onChange = open(recipe())

    fireEvent.click(await screen.findByRole('button', { name: '4 von 5' }))
    expect(foodly.setMyRating).toHaveBeenCalledWith(5, 4)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(updated))
    expect(screen.getByText('Demo: nur in diesem Browser gespeichert')).toBeTruthy()
  })

  it('fills the stars once the parent passes the updated recipe back', async () => {
    vi.mocked(foodly.setMyRating).mockResolvedValue(recipe({ rating: [{ user: 1, rating: 4 }] }))
    function Stateful() {
      const [current, setCurrent] = useState(recipe())
      return <Rating recipe={current} onChange={setCurrent} />
    }
    render(<Stateful />)
    fireEvent.click(screen.getByRole('button', { name: 'Bewerten' }))
    fireEvent.click(await screen.findByRole('button', { name: '4 von 5' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '4 von 5' }).getAttribute('aria-pressed')).toBe('true'),
    )
    expect((screen.getByRole('button', { name: 'Entfernen' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps Entfernen disabled while unrated', async () => {
    open(recipe())
    expect(((await screen.findByRole('button', { name: 'Entfernen' })) as HTMLButtonElement).disabled).toBe(true)
  })

  it('removes the own rating', async () => {
    const cleared = recipe()
    vi.mocked(foodly.clearMyRating).mockResolvedValue(cleared)
    const onChange = open(recipe({ rating: [{ user: 1, rating: 3 }] }))

    expect((await screen.findByRole('button', { name: '3 von 5' })).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Entfernen' }))
    expect(foodly.clearMyRating).toHaveBeenCalledWith(5)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(cleared))
  })

  it('disables the stars while a write is in flight', async () => {
    vi.mocked(foodly.setMyRating).mockReturnValue(new Promise(() => {}))
    open(recipe())
    fireEvent.click(await screen.findByRole('button', { name: '4 von 5' }))
    expect((screen.getByRole('button', { name: '5 von 5' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables the stars while the current user is unknown', async () => {
    currentUser.id = null
    open(recipe())
    expect(((await screen.findByRole('button', { name: '4 von 5' })) as HTMLButtonElement).disabled).toBe(true)
  })

  it('labels the trigger with the current value', () => {
    render(<Rating recipe={recipe({ rating: [{ user: 1, rating: 4 }] })} />)
    expect(screen.getByRole('button', { name: 'Bewertung 4,0 von 5' })).toBeTruthy()
  })

  it('shows a failed write inline', async () => {
    vi.mocked(foodly.setMyRating).mockRejectedValue(new Error('kaputt'))
    open(recipe())
    fireEvent.click(await screen.findByRole('button', { name: '2 von 5' }))
    expect(await screen.findByText('kaputt')).toBeTruthy()
  })

  it('hides the demo hint when ratings are not stubbed', async () => {
    stubbed.value = false
    open(recipe())
    await screen.findByText('Deine Bewertung')
    expect(screen.queryByText(/^Demo:/)).toBeNull()
  })

  it('keeps average and raters in collaborative mode next to the editable row', async () => {
    open(
      recipe({
        editors: [2],
        rating: [
          { user: 1, rating: 4 },
          { user: 2, rating: 2 },
        ],
      }),
    )
    expect(await screen.findByText('Durchschnitt')).toBeTruthy()
    expect(screen.getByText('Deine Bewertung')).toBeTruthy()
    expect(screen.getByText('User 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: '4 von 5' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('omits the average row in collaborative mode without ratings', async () => {
    open(recipe({ editors: [2] }))
    await screen.findByText('Deine Bewertung')
    expect(screen.queryByText('Durchschnitt')).toBeNull()
  })

  it('opens a popover with the compact stars on desktop', async () => {
    open(recipe())
    const panel = await screen.findByRole('dialog')
    expect(panel.getAttribute('data-slot')).toBe('popover-content')
    for (const star of screen.getAllByRole('button', { name: /^\d von 5$/ })) {
      expect(star.className).toContain('size-7.5')
      expect(star.className).not.toContain('size-10')
    }
  })
})

describe('Rating on a phone', () => {
  beforeEach(() => setViewport(375))
  afterEach(() => setViewport(1024))

  it('opens a bottom sheet with title and close button, and returns focus on close', async () => {
    render(<Rating recipe={recipe()} />)
    // Grabbed before opening: the modal sheet hides everything else from the accessibility tree.
    const trigger = screen.getByRole('button', { name: 'Bewerten' })
    fireEvent.click(trigger)

    const sheet = await screen.findByRole('dialog', { name: 'Bewertung' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Bewertung' })).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('uses the sheet right below the desktop breakpoint', async () => {
    setViewport(760)
    open(recipe())
    expect(await screen.findByRole('dialog', { name: 'Bewertung' })).toBeTruthy()
  })

  it('keeps the popover from the desktop breakpoint up', async () => {
    setViewport(761)
    open(recipe())
    expect((await screen.findByRole('dialog')).getAttribute('data-slot')).toBe('popover-content')
  })

  it('shows a failed write inside the sheet', async () => {
    vi.mocked(foodly.setMyRating).mockRejectedValue(new Error('kaputt'))
    open(recipe())
    const sheet = await screen.findByRole('dialog', { name: 'Bewertung' })
    fireEvent.click(within(sheet).getByRole('button', { name: '2 von 5' }))
    expect(await within(sheet).findByText('kaputt')).toBeTruthy()
  })

  it('gives the stars a 40 px tap target', async () => {
    open(recipe())
    const sheet = await screen.findByRole('dialog', { name: 'Bewertung' })
    const stars = within(sheet).getAllByRole('button', { name: /^\d von 5$/ })
    expect(stars).toHaveLength(5)
    for (const star of stars) {
      expect(star.className).toContain('size-10')
      expect(star.className).not.toContain('size-9')
    }
    expect(within(sheet).getByRole('button', { name: 'Entfernen' }).className).toContain('h-10')
  })

  it('closes the sheet and keeps the trigger when the viewport grows to desktop', async () => {
    open(recipe())
    await screen.findByRole('dialog', { name: 'Bewertung' })
    setViewport(1024)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // The unmounted modal must not leave the page locked.
    expect(document.body.style.pointerEvents).not.toBe('none')
    fireEvent.click(screen.getByRole('button', { name: 'Bewerten' }))
    expect((await screen.findByRole('dialog')).getAttribute('data-slot')).toBe('popover-content')
  })

  it('rates from the sheet', async () => {
    const updated = recipe({ rating: [{ user: 1, rating: 4 }] })
    vi.mocked(foodly.setMyRating).mockResolvedValue(updated)
    const onChange = open(recipe())

    const sheet = await screen.findByRole('dialog', { name: 'Bewertung' })
    fireEvent.click(within(sheet).getByRole('button', { name: '4 von 5' }))
    expect(foodly.setMyRating).toHaveBeenCalledWith(5, 4)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(updated))
    expect(within(sheet).getByRole('button', { name: 'Entfernen' })).toBeTruthy()
    expect(within(sheet).getByText('Demo: nur in diesem Browser gespeichert')).toBeTruthy()
  })

  it('shows the shared collaborative content in the sheet', async () => {
    open(
      recipe({
        editors: [2],
        rating: [
          { user: 1, rating: 4 },
          { user: 2, rating: 2 },
        ],
      }),
    )
    const sheet = await screen.findByRole('dialog', { name: 'Bewertung' })
    expect(within(sheet).getByText('Durchschnitt')).toBeTruthy()
    expect(within(sheet).getByText('Bearbeiter')).toBeTruthy()
    expect(within(sheet).getByText('User 2')).toBeTruthy()
  })
})
