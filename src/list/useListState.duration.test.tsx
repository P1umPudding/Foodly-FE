import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { DurationFilter } from '../components/list/filters/DurationFilter'
import { useRecipeSearch } from '../hooks/useRecipeSearch'
import { foodly } from '../api'
import { useListState } from './useListState'
import { buildSearchQuery } from './query'
import { drag, stubSliderPointer } from '../test/slider'

// #130: one drag / typing session / burst of arrow keys = one history entry and one search with the end value.
// Wires the real list state and search hook to the filter, the way RecipeList does, without the page around it.

vi.mock('../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1 }))

let navigate: ReturnType<typeof useNavigate>

function Harness() {
  const { state, set } = useListState()
  useRecipeSearch(buildSearchQuery(state))
  navigate = useNavigate()
  const location = useLocation()
  return (
    <>
      <span data-testid="location">{location.pathname + location.search}</span>
      <DurationFilter value={state.durationMax} set={set} />
    </>
  )
}

const location = () => screen.getByTestId('location').textContent
const field = () => screen.getByLabelText<HTMLInputElement>('Maximale Arbeitszeit in Minuten')
const sliderRoot = () => screen.getByLabelText('Maximale Arbeitszeit')
const back = () => act(() => navigate(-1))

let search: MockInstance<typeof foodly.searchRecipes>
// Searches after the initial page load, as their maxWorkTime filters.
const searchedLimits = () => search.mock.calls.slice(1).map(([q]) => q.filters?.maxWorkTime ?? null)

beforeEach(() => {
  localStorage.clear()
  stubSliderPointer()
  // Never settles: only the calls matter, and a settling search would update the harness outside act().
  search = vi.spyOn(foodly, 'searchRecipes').mockReturnValue(new Promise(() => {}))
  render(
    <MemoryRouter initialEntries={['/other', '/recipes?dmax=60']} initialIndex={1}>
      <Harness />
    </MemoryRouter>,
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('duration filter → list state (#130)', () => {
  it('a drag over several steps adds one history entry and runs one search with the end value', () => {
    expect(search).toHaveBeenCalledTimes(1)
    drag(sliderRoot(), 120, 100, 80, 45)
    expect(location()).toBe('/recipes?dmax=45')
    expect(searchedLimits()).toEqual([45])
    back()
    expect(location()).toBe('/recipes?dmax=60')
    expect(field().value).toBe('60')
    back()
    expect(location()).toBe('/other')
  })

  it('typing several digits adds one entry and one search, on blur', () => {
    fireEvent.change(field(), { target: { value: '1' } })
    fireEvent.change(field(), { target: { value: '12' } })
    fireEvent.change(field(), { target: { value: '120' } })
    expect(searchedLimits()).toEqual([])
    fireEvent.blur(field())
    expect(location()).toBe('/recipes?dmax=120')
    expect(searchedLimits()).toEqual([120])
    back()
    expect(location()).toBe('/recipes?dmax=60')
  })

  it('a burst of arrow keys adds one entry and one search after the pause', async () => {
    vi.useFakeTimers()
    const thumb = screen.getByRole('slider')
    for (let i = 0; i < 4; i++) fireEvent.keyDown(thumb, { key: 'ArrowRight' })
    expect(searchedLimits()).toEqual([])
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(location()).toBe('/recipes?dmax=80')
    expect(searchedLimits()).toEqual([80])
    back()
    expect(location()).toBe('/recipes?dmax=60')
  })

  it('Back with an unfinished edit stays where it went, even when the field blurs afterwards', () => {
    fireEvent.change(field(), { target: { value: '120' } })
    back()
    fireEvent.blur(field())
    expect(location()).toBe('/other')
  })
})
