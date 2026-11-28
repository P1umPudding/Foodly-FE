// The start page inside the real app in mock mode, with the real catalog and mock recipes.
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setViewport } from '../test/viewport'

// Mock mode is decided when src/api loads, so the app is imported fresh with VITE_MOCK=1.
let api: typeof import('../api')
let App: typeof import('../App').default

beforeEach(async () => {
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  api = await import('../api')
  ;({ default: App } = await import('../App'))
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
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
  await screen.findByRole('main', {}, WAIT)
}

describe('Start page, Zuletzt bearbeitet (mock mode)', () => {
  it(
    'shows the 6 last edited recipes, own and shared, newest first',
    async () => {
      await renderHome()
      const section = await screen.findByRole('region', { name: 'Zuletzt bearbeitet' }, WAIT)
      await within(section).findByRole('link', { name: 'Alle Rezepte' }, WAIT)
      const hrefs = within(section)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href'))
        .filter((href) => /^\/recipes\/\d+$/.test(href ?? ''))
      // By updatedAt in the mock data; 14 (Jonas) and 11, 9 are shared with user 1.
      expect(hrefs).toEqual(['/recipes/12', '/recipes/4', '/recipes/14', '/recipes/13', '/recipes/11', '/recipes/9'])
      expect(screen.queryByRole('heading', { name: 'Zuletzt erstellt' })).toBeNull()
      expect(screen.queryByRole('heading', { name: 'Zuletzt angesehen' })).toBeNull()
    },
    SLOW,
  )
})

describe('Start page, Geteilt mit dir (mock mode)', () => {
  it(
    'shows the 3 newest shares with their owners, newest first',
    async () => {
      await renderHome()
      const section = await screen.findByRole('region', { name: 'Geteilt mit dir' }, WAIT)
      // By myAccessSince: 14 (Jonas, Sept.), 11 (Mara, June 18), 9 (Jonas, June 4); 7 and 3 are older.
      await within(section).findAllByText('von Jonas', {}, WAIT)
      const links = within(section).getAllByRole('link')
      expect(links.map((a) => a.getAttribute('href'))).toEqual(['/recipes/14', '/recipes/11', '/recipes/9'])
      expect(links.map((a) => within(a).getByText(/^von /).textContent)).toEqual(['von Jonas', 'von Mara', 'von Jonas'])
      within(links[0]).getByText('Asiatische Gemüsepfanne mit Reis')
    },
    SLOW,
  )
})
