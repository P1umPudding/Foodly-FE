import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../api'
import { ThemeProvider } from '../theme/ThemeProvider'
import { Profile } from './Profile'

vi.mock('../catalog/CatalogProvider', () => ({
  useMe: () => ({ id: 1, name: 'Kolja', profilePicture: null }),
}))

type RequestMethod = Exclude<keyof typeof foodly, 'auth'>

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)))

function renderProfile() {
  render(
    <ThemeProvider>
      <MemoryRouter useTransitions={false}>
        <Profile />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('Profile', () => {
  it('shows the signed-in user with their initial', () => {
    renderProfile()
    screen.getByRole('heading', { level: 1, name: 'Profil & Einstellungen' })
    screen.getByRole('heading', { name: 'Kolja' })
    screen.getByText('K')
  })

  // #304: the mockup's „42 Rezepte“ needs a count no loaded data holds (B19), so the head shows none and the page
  // must not fetch one. The catalog is mocked here, so this covers the page itself.
  it('shows no recipe count and sends no request', async () => {
    const methods = (Object.keys(foodly) as (keyof typeof foodly)[]).filter((k): k is RequestMethod => k !== 'auth')
    const spies = [
      ...methods.map((k) => vi.spyOn(foodly, k)),
      vi.spyOn(foodly.auth, 'signIn'),
      vi.spyOn(foodly.auth, 'signUp'),
      vi.spyOn(foodly.auth, 'signOut'),
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no request expected')),
    ]
    renderProfile()
    await flush()
    expect(document.body.textContent).not.toMatch(/\d+\s*Rezept/)
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('switches the theme from the Design segment', async () => {
    renderProfile()
    screen.getByRole('heading', { name: 'Darstellung' })
    fireEvent.click(within(screen.getByRole('group', { name: 'Design' })).getByRole('radio', { name: 'Dunkel' }))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    expect(localStorage.getItem('foodly-theme')).toBe('dark')
  })

  it('links to the categories', () => {
    renderProfile()
    expect(screen.getByRole('link', { name: 'Kategorien' }).getAttribute('href')).toBe('/categories')
  })

  it('signs out with Abmelden', () => {
    const signOut = vi.spyOn(foodly.auth, 'signOut').mockResolvedValue()
    renderProfile()
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }))
    expect(signOut).toHaveBeenCalledOnce()
  })
})
