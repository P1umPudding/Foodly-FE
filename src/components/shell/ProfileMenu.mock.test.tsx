import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// Mock mode is decided when src/api loads, so the menu is imported fresh with VITE_MOCK=1.
vi.mock('../../catalog/CatalogProvider', () => ({
  CatalogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useMe: () => ({ id: 1, name: 'Kim', profilePicture: null }),
}))
vi.mock('../ThemeMenu', () => ({ ThemeSubmenu: () => null }))

let ProfileMenu: typeof import('./ProfileMenu').ProfileMenu

beforeEach(async () => {
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  ;({ ProfileMenu } = await import('./ProfileMenu'))
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('has no Abmelden in mock mode', async () => {
  render(<ProfileMenu variant="row" />)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Kim – Profil & Einstellungen' }), { key: 'Enter' })
  await screen.findByRole('menu')
  expect(screen.queryByRole('menuitem', { name: 'Abmelden' })).toBeNull()
})
