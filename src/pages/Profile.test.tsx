import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../api'
import { ThemeProvider } from '../theme/ThemeProvider'
import { Profile } from './Profile'

vi.mock('../catalog/CatalogProvider', () => ({
  useMe: () => ({ id: 1, name: 'Kolja', profilePicture: null }),
}))

function renderProfile() {
  render(
    <ThemeProvider>
      <MemoryRouter>
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
