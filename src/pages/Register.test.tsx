import { act, fireEvent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { foodly } from '../api'
import { jsonResponse, jwt } from '../test/auth'
import { renderAuthRoutes } from '../test/authRoutes'
import { Register } from './Register'

vi.mock('../components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const user = { id: 7, name: 'Kim', profilePicture: null }

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.title = ''
})

const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label)
const noteOf = (input: HTMLInputElement) => document.getElementById(input.getAttribute('aria-describedby') ?? '')
const reply = (respond: () => Response) => vi.spyOn(globalThis, 'fetch').mockImplementation(async () => respond())

function fill(name: string, email: string, password: string) {
  fireEvent.change(field('Name'), { target: { value: name } })
  fireEvent.change(field('E-Mail'), { target: { value: email } })
  fireEvent.change(field('Passwort'), { target: { value: password } })
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Konto anlegen' }))
  })
}

describe('Register', () => {
  it('sets the page title and shows the password hint', () => {
    renderAuthRoutes('/register', { register: <Register /> })
    expect(document.title).toBe('Konto anlegen · Foodly')
    const hint = noteOf(field('Passwort'))
    expect(hint?.textContent).toBe('Mindestens 8 Zeichen')
    expect(hint?.className).not.toContain('text-destructive')
  })

  it('rejects a 7-character password at the field without a request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderAuthRoutes('/register', { register: <Register /> })
    fill('Kim', 'kim@example.com', '1234567')
    await submit()
    expect(fetchSpy).not.toHaveBeenCalled()
    const password = field('Passwort')
    expect(password.getAttribute('aria-invalid')).toBe('true')
    expect(noteOf(password)?.className).toContain('text-destructive')
    expect(screen.getAllByText('Mindestens 8 Zeichen')).toHaveLength(1)
    expect(document.activeElement).toBe(password)
  })

  it('does not check the password when focus moves to the show-password button', () => {
    renderAuthRoutes('/register', { register: <Register /> })
    const toggle = screen.getByRole('button', { name: 'Passwort anzeigen' })
    fireEvent.change(field('Passwort'), { target: { value: 'short' } })
    fireEvent.blur(field('Passwort'), { relatedTarget: toggle })
    expect(field('Passwort').getAttribute('aria-invalid')).toBeNull()
  })

  it('checks the password when tabbing on from the show-password button', () => {
    renderAuthRoutes('/register', { register: <Register /> })
    const toggle = screen.getByRole('button', { name: 'Passwort anzeigen' })
    fireEvent.change(field('Passwort'), { target: { value: 'short' } })
    fireEvent.blur(field('Passwort'), { relatedTarget: toggle })
    fireEvent.blur(toggle, { relatedTarget: screen.getByRole('button', { name: 'Konto anlegen' }) })
    expect(field('Passwort').getAttribute('aria-invalid')).toBe('true')
  })

  it('checks the password on leaving the field', () => {
    renderAuthRoutes('/register', { register: <Register /> })
    fireEvent.change(field('Passwort'), { target: { value: 'short' } })
    fireEvent.blur(field('Passwort'))
    expect(field('Passwort').getAttribute('aria-invalid')).toBe('true')
  })

  it('on 409 points to the e-mail field with a sign-in link carrying the e-mail', async () => {
    reply(() => jsonResponse(409, { error: { code: 'CONFLICT', message: 'Email taken' } }))
    renderAuthRoutes('/register?next=%2Frecipes%2F5', { register: <Register /> })
    fill('Kim', 'kim@example.com', 'password123')
    await submit()
    const email = field('E-Mail')
    expect(email.getAttribute('aria-invalid')).toBe('true')
    const note = noteOf(email)
    expect(note?.textContent).toBe('Diese E-Mail ist schon registriert. Anmelden')
    expect(note?.querySelector('a')?.getAttribute('href')).toBe('/login?email=kim%40example.com&next=%2Frecipes%2F5')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.activeElement).toBe(email)
  })

  it('on 422 without a backend message shows the generic text', async () => {
    reply(() => jsonResponse(422, { error: {} }))
    renderAuthRoutes('/register', { register: <Register /> })
    fill('Kim', 'kim@example.com', 'password123')
    await submit()
    expect(screen.getByRole('alert').textContent).toBe('Registrieren hat nicht geklappt. Bitte versuch es noch einmal.')
  })

  it('on 201 signs in and goes to next', async () => {
    vi.spyOn(foodly, 'me').mockResolvedValue(user)
    vi.spyOn(foodly, 'listTags').mockResolvedValue([])
    vi.spyOn(foodly, 'getUsers').mockResolvedValue([])
    vi.spyOn(foodly, 'listIngredients').mockResolvedValue([])
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])
    const fetchSpy = reply(() => jsonResponse(201, { user, accessToken: jwt(900), refreshToken: 'r1' }))
    renderAuthRoutes('/register?next=%2Frecipes%2F5', { register: <Register /> })
    fill(' Kim ', 'kim@example.com', 'password123')
    await submit()
    expect(await screen.findByText('app /recipes/5')).toBeTruthy()
    expect(fetchSpy.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ name: 'Kim', email: 'kim@example.com', password: 'password123' }),
    )
    expect(foodly.auth.session()).toEqual({ userId: 7 })
  })

  it.each([
    [422, 'Name must not be empty', 'Name must not be empty'],
    [429, 'slow down', 'Zu viele Versuche. Bitte warte kurz und versuch es dann noch einmal.'],
    [500, 'boom', 'Registrieren hat nicht geklappt. Bitte versuch es noch einmal.'],
  ])('on %i shows an alert', async (status, message, text) => {
    reply(() => jsonResponse(status, { error: { code: 'X', message } }))
    renderAuthRoutes('/register', { register: <Register /> })
    fill('Kim', 'kim@example.com', 'password123')
    await submit()
    expect(screen.getByRole('alert').textContent).toBe(text)
  })

  it('links to /login and keeps next', () => {
    renderAuthRoutes('/register?next=%2Frecipes%2F5', { register: <Register /> })
    expect(screen.getByRole('link', { name: 'Anmelden' }).getAttribute('href')).toBe('/login?next=%2Frecipes%2F5')
  })
})
