// Abmelden from the profile menu, end to end through the guard: logout request, cleared session,
// /login, and a fresh catalog for the next user.
import { act, fireEvent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../../api'
import { resetSessionEnd } from '../../api/auth'
import { Login } from '../../pages/Login'
import { jsonResponse, jwt, seedSession, storedSession } from '../../test/auth'
import { renderAuthRoutes } from '../../test/authRoutes'
import { ProfileMenu } from './ProfileMenu'

vi.mock('./AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => (
    <>
      <ProfileMenu variant="row" />
      {children}
    </>
  ),
}))
// useTheme needs a ThemeProvider, which the route tree doesn't have.
vi.mock('../ThemeMenu', () => ({ ThemeSubmenu: () => null }))

const kim = { id: 1, name: 'Kim', profilePicture: null }
const lee = { id: 2, name: 'Lee', profilePicture: null }

function spyCatalogs() {
  vi.spyOn(foodly, 'listTags').mockResolvedValue([])
  vi.spyOn(foodly, 'listUsers').mockResolvedValue([])
  vi.spyOn(foodly, 'listIngredients').mockResolvedValue([])
  vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
  return vi.spyOn(foodly, 'me').mockResolvedValueOnce(kim).mockResolvedValue(lee)
}

function spyFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const path = String(url)
    if (path.endsWith('/auth/logout')) return jsonResponse(204)
    if (path.endsWith('/auth/login')) return jsonResponse(200, { user: lee, accessToken: jwt(900), refreshToken: 'r2' })
    throw new Error(`unexpected fetch ${path}`)
  })
}

async function signOutFromMenu(name: string) {
  fireEvent.keyDown(await screen.findByRole('button', { name: `${name} – Profil & Einstellungen` }), { key: 'Enter' })
  await screen.findByRole('menu')
  act(() => {
    fireEvent.click(screen.getByRole('menuitem', { name: 'Abmelden' }))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  resetSessionEnd()
})

describe('Abmelden', () => {
  it('sends the logout with the refresh token, clears the session and shows /login', async () => {
    seedSession({ refreshToken: 'r1' })
    spyCatalogs()
    const fetchSpy = spyFetch()
    renderAuthRoutes('/recipes/5')
    await signOutFromMenu('Kim')

    expect(screen.getByTestId('location').textContent).toBe('login /login')
    expect(storedSession()).toBeNull()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toMatch(/\/auth\/logout$/)
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ refreshToken: 'r1' }))
  })

  it('shows the new name after signing in as someone else', async () => {
    seedSession()
    const me = spyCatalogs()
    spyFetch()
    renderAuthRoutes('/recipes/5', { login: <Login /> })
    await signOutFromMenu('Kim')

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'lee@example.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'password123' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
    })

    expect(await screen.findByRole('button', { name: 'Lee – Profil & Einstellungen' })).toBeTruthy()
    expect(me).toHaveBeenCalledTimes(2)
    expect(storedSession()?.userId).toBe(2)
  })
})
