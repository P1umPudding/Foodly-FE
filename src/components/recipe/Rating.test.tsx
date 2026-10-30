import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Rating } from './Rating'
import { foodly } from '../../api'
import type { Recipe } from '../../api/protocol'

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
    expect(screen.getByRole('button', { name: 'Bewertung 4,0 von 5, ändern' })).toBeTruthy()
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
})
