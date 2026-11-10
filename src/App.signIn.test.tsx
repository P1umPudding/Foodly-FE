import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { jsonResponse, jwt } from './test/auth'
import App from './App'

// The whole round trip on the real routes and the real Login page: guarded page → /login?next → back.
function Detail() {
  const { pathname } = useLocation()
  return <p data-testid="page">detail {pathname}</p>
}

vi.mock('./components/shell/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('./catalog/CatalogProvider', () => ({
  CatalogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('./pages/RecipeDetail', () => ({ RecipeDetail: Detail }))

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('a signed-out visit to /recipes/5 ends on /recipes/5 after signing in', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    jsonResponse(200, {
      user: { id: 1, name: 'Kim', profilePicture: null },
      accessToken: jwt(900),
      refreshToken: 'r1',
    }),
  )
  render(
    <MemoryRouter initialEntries={['/recipes/5']}>
      <App />
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'user1@example.com' } })
  fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'password123' } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
  })
  expect((await screen.findByTestId('page')).textContent).toBe('detail /recipes/5')
})
