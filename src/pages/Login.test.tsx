import { act, fireEvent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../api'
import { jsonResponse, jwt } from '../test/auth'
import { renderAuthRoutes } from '../test/authRoutes'
import { Login } from './Login'

vi.mock('../components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const user = { id: 1, name: 'Kim', profilePicture: null }

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.title = ''
})

function mockCatalogs() {
  vi.spyOn(foodly, 'me').mockResolvedValue(user)
  vi.spyOn(foodly, 'listTags').mockResolvedValue([])
  vi.spyOn(foodly, 'listUsers').mockResolvedValue([])
  vi.spyOn(foodly, 'listIngredients').mockResolvedValue([])
  vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
}

const loginReply = (reply: () => Response | Promise<Response>) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => reply())
const ok = () => jsonResponse(200, { user, accessToken: jwt(900), refreshToken: 'r1' })

const email = () => screen.getByLabelText<HTMLInputElement>('E-Mail')
const password = () => screen.getByLabelText<HTMLInputElement>('Passwort')

async function signIn(path: string, mail = 'kim@example.com', pw = 'password123') {
  renderAuthRoutes(path, { login: <Login /> })
  fireEvent.change(email(), { target: { value: mail } })
  fireEvent.change(password(), { target: { value: pw } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
  })
}

describe('Login', () => {
  it('sets the page title and restores the previous one on leaving', () => {
    document.title = 'Foodly'
    const { unmount } = renderAuthRoutes('/login', { login: <Login /> })
    expect(document.title).toBe('Anmelden · Foodly')
    unmount()
    expect(document.title).toBe('Foodly')
  })

  it('goes to next after signing in', async () => {
    mockCatalogs()
    const fetchSpy = loginReply(ok)
    await signIn('/login?next=%2Frecipes%2F5')
    expect(await screen.findByText('app /recipes/5')).toBeTruthy()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toMatch(/\/auth\/login$/)
    expect(init?.body).toBe(JSON.stringify({ email: 'kim@example.com', password: 'password123' }))
  })

  it.each(['//evil.example', 'https://evil.example'])('goes to /recipes for next=%s', async (next) => {
    mockCatalogs()
    loginReply(ok)
    await signIn(`/login?next=${encodeURIComponent(next)}`)
    expect(await screen.findByText('app /recipes')).toBeTruthy()
  })

  it('on 401 keeps the e-mail, clears and focuses the password', async () => {
    loginReply(() => jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }))
    await signIn('/login')
    expect(screen.getByRole('alert').textContent).toBe('E-Mail oder Passwort stimmt nicht.')
    expect(email().value).toBe('kim@example.com')
    expect(password().value).toBe('')
    expect(document.activeElement).toBe(password())
    fireEvent.blur(password())
    expect(password().getAttribute('aria-invalid')).toBeNull()
  })

  it('on 429 asks to wait', async () => {
    loginReply(() => jsonResponse(429, { error: { code: 'TOO_MANY_REQUESTS', message: 'slow down' } }))
    await signIn('/login')
    expect(screen.getByRole('alert').textContent).toBe(
      'Zu viele Versuche. Bitte warte kurz und versuch es dann noch einmal.',
    )
    expect(password().value).toBe('password123')
  })

  it.each([
    ['a network error', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['a server error', () => jsonResponse(500, { error: { code: 'INTERNAL', message: 'boom' } })],
  ])('on %s shows the generic text', async (_, reply) => {
    loginReply(reply)
    await signIn('/login')
    expect(screen.getByRole('alert').textContent).toBe('Anmelden hat nicht geklappt. Bitte versuch es noch einmal.')
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Anmelden' }).disabled).toBe(false)
  })

  it('checks empty fields without a request and focuses the first one', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderAuthRoutes('/login', { login: <Login /> })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
    })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(email().getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(email().getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Bitte gib deine E-Mail ein.',
    )
    expect(screen.getByText('Bitte gib dein Passwort ein.')).toBeTruthy()
    expect(document.activeElement).toBe(email())
  })

  it('toggles the password visibility without submitting', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderAuthRoutes('/login', { login: <Login /> })
    expect(password().type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Passwort anzeigen' }))
    expect(password().type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Passwort verbergen' }))
    expect(password().type).toBe('password')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('prefills the e-mail from ?email= and focuses the password', () => {
    renderAuthRoutes('/login?email=kim%40example.com', { login: <Login /> })
    expect(email().value).toBe('kim@example.com')
    expect(document.activeElement).toBe(password())
  })

  it('links to /register and keeps next', () => {
    renderAuthRoutes('/login?next=%2Frecipes%2F5', { login: <Login /> })
    expect(screen.getByRole('link', { name: 'Registrieren' }).getAttribute('href')).toBe(
      '/register?next=%2Frecipes%2F5',
    )
  })
})
