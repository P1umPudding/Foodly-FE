// The start page inside the real app in mock mode: "Zuletzt angesehen" with the real catalog and mock recipes.
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setViewport } from '../test/viewport'

// Mock mode is decided when src/api loads, so the app is imported fresh with VITE_MOCK=1.
let api: typeof import('../api')
let App: typeof import('../App').default
let recentlyViewed: typeof import('../home/recentlyViewed')

beforeEach(async () => {
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  api = await import('../api')
  ;({ default: App } = await import('../App'))
  recentlyViewed = await import('../home/recentlyViewed')
  await api.bootstrap()
  setViewport(1200)
  localStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

// Each mock call waits 250 ms, and the first render pays for the fresh module graph.
const SLOW = 10_000
const WAIT = { timeout: 3000 }

async function renderHome() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
  await screen.findByRole('main', {}, WAIT)
}

describe('Start page, Zuletzt angesehen (mock mode)', () => {
  it(
    'shows the stored recipes in order, drops a deleted one and forgets it',
    async () => {
      // 4 = Ofengemüse, 12 = Cremige Tomatensuppe (user 1's own); 999999 doesn't exist (deleted).
      localStorage.setItem('foodly:recently-viewed:1', JSON.stringify({ version: 1, ids: [4, 999999, 12] }))
      await renderHome()
      const section = await screen.findByRole('region', { name: 'Zuletzt angesehen' }, WAIT)
      await within(section).findByRole('link', { name: /Ofengemüse/ }, WAIT)
      const links = within(section).getAllByRole('link')
      expect(links.map((a) => a.getAttribute('href'))).toEqual(['/recipes/4', '/recipes/12'])
      expect(links[1].textContent).toMatch(/Cremige Tomatensuppe/)
      await waitFor(() => expect(recentlyViewed.readRecentlyViewed(1)).toEqual([4, 12]), WAIT)
    },
    SLOW,
  )

  it(
    'names the owner of a foreign recipe',
    async () => {
      // 3 = Pfannkuchen, owned by Mara (user 2), shared with user 1.
      localStorage.setItem('foodly:recently-viewed:1', JSON.stringify({ version: 1, ids: [3] }))
      await renderHome()
      const section = await screen.findByRole('region', { name: 'Zuletzt angesehen' }, WAIT)
      await within(section).findByText('von Mara', {}, WAIT)
    },
    SLOW,
  )

  it(
    'has no section without stored recipes',
    async () => {
      await renderHome()
      // The page has settled once the categories (D2) are shown; user 1 has some in the mock data.
      await screen.findByRole('region', { name: 'Kategorien' }, WAIT)
      expect(screen.queryByRole('heading', { name: 'Zuletzt angesehen' })).toBeNull()
    },
    SLOW,
  )
})
