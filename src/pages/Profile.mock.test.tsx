import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// Mock mode is decided when src/api loads, so the page is imported fresh with VITE_MOCK=1.
vi.mock('../catalog/CatalogProvider', () => ({
  useMe: () => ({ id: 1, name: 'Kim', profilePicture: null }),
}))
// The fresh import would bring its own ThemeProvider context, so the segment is left out here.
vi.mock('../components/ThemeMenu', () => ({ ThemeSegment: () => null }))

let Profile: typeof import('./Profile').Profile

beforeEach(async () => {
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  ;({ Profile } = await import('./Profile'))
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('has no Abmelden in mock mode', () => {
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
  screen.getByRole('link', { name: 'Kategorien' })
  expect(screen.queryByRole('button', { name: 'Abmelden' })).toBeNull()
})
