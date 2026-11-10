import { act, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../../api'
import { jsonResponse, seedSession } from '../../test/auth'
import { renderAuthRoutes } from '../../test/authRoutes'

vi.mock('./AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }))

const location = () => screen.getByTestId('location').textContent

function spyCatalogs() {
  return [
    vi.spyOn(foodly, 'me').mockResolvedValue({ id: 1, name: 'Kim', profilePicture: null }),
    vi.spyOn(foodly, 'listTags').mockResolvedValue([]),
    vi.spyOn(foodly, 'listUsers').mockResolvedValue([]),
    vi.spyOn(foodly, 'listIngredients').mockResolvedValue([]),
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([]),
  ]
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('RequireAuth', () => {
  it('sends a signed-out visitor to /login with the page as next, without loading catalogs', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const catalogs = spyCatalogs()
    renderAuthRoutes('/recipes/5')
    expect(location()).toBe('login /login?next=%2Frecipes%2F5')
    catalogs.forEach((spy) => expect(spy).not.toHaveBeenCalled())
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps query and hash in next', () => {
    renderAuthRoutes('/recipes?cat=3#top')
    expect(location()).toBe(`login /login?next=${encodeURIComponent('/recipes?cat=3#top')}`)
  })

  it('renders the page with a session', async () => {
    seedSession()
    const [me] = spyCatalogs()
    renderAuthRoutes('/recipes/5')
    expect(await screen.findByText('app /recipes/5')).toBeTruthy()
    expect(me).toHaveBeenCalled()
  })

  it('goes back to /login when the session ends while the app is open', async () => {
    seedSession()
    spyCatalogs()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(204))
    renderAuthRoutes('/recipes/5')
    await screen.findByText('app /recipes/5')
    await act(() => foodly.auth.signOut())
    expect(location()).toBe('login /login?next=%2Frecipes%2F5')
  })
})

describe('RedirectIfSignedIn', () => {
  it('sends a signed-in user from /login to /recipes', async () => {
    seedSession()
    spyCatalogs()
    renderAuthRoutes('/login')
    expect(await screen.findByText('app /recipes')).toBeTruthy()
  })

  it('follows a valid next and ignores a foreign one', async () => {
    seedSession()
    spyCatalogs()
    renderAuthRoutes('/register?next=%2Frecipes%2F5')
    expect(await screen.findByText('app /recipes/5')).toBeTruthy()
  })

  it.each(['//evil.example', 'https://evil.example'])('ignores next=%s', async (next) => {
    seedSession()
    spyCatalogs()
    renderAuthRoutes(`/login?next=${encodeURIComponent(next)}`)
    expect(await screen.findByText('app /recipes')).toBeTruthy()
  })

  it('shows the page without a session', () => {
    renderAuthRoutes('/login?next=%2Frecipes%2F5')
    expect(location()).toBe('login /login?next=%2Frecipes%2F5')
  })
})
