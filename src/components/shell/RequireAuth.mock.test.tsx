import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock mode is decided when src/api loads, so the route tree is imported fresh with VITE_MOCK=1.
vi.mock('./AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../catalog/CatalogProvider', () => ({
  CatalogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

let renderAuthRoutes: typeof import('../../test/authRoutes').renderAuthRoutes

beforeEach(async () => {
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  ;({ renderAuthRoutes } = await import('../../test/authRoutes'))
})

afterEach(() => {
  vi.unstubAllEnvs()
  localStorage.clear()
})

describe('guards in mock mode', () => {
  it('protects nothing', async () => {
    renderAuthRoutes('/recipes/5')
    expect(await screen.findByText('app /recipes/5')).toBeTruthy()
  })

  it('forwards /login to /recipes', async () => {
    renderAuthRoutes('/login')
    expect(await screen.findByText('app /recipes')).toBeTruthy()
  })
})
