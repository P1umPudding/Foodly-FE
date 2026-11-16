// #269: no "Function components cannot be given refs" on the pages with a ⋯ menu behind a tooltip, and that ⋯ still
// behaves (tooltip on focus, menu on click, Escape returns focus). The real app in mock mode, like Categories.mock.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { setViewport } from '../test/viewport'

let App: typeof import('../App').default

// React warns once per JSX line for the whole file (resetModules doesn't reset react-dom), so one spy collects
// everything and each route test only looks at what its own render added. No restoreAllMocks: it would drop the spy.
let consoleError: MockInstance<typeof console.error>
beforeAll(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterAll(() => consoleError.mockRestore())

beforeEach(async () => {
  vi.stubEnv('VITE_MOCK', '1')
  vi.resetModules()
  const api = await import('../api')
  ;({ default: App } = await import('../App'))
  await api.bootstrap()
  setViewport(1200)
})
afterEach(() => vi.unstubAllEnvs())

// Each mock call waits 250 ms, and the first render pays for the fresh module graph.
const SLOW = 10_000

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const refWarnings = (from: number) =>
  consoleError.mock.calls
    .slice(from)
    .map((args) => args.map(String).join(' '))
    .filter((message) => message.includes('cannot be given refs'))

const findTrigger = (name: string) => screen.findByRole('button', { name }, { timeout: 3000 })
const titleField = () => screen.findByLabelText('Titel', undefined, { timeout: 3000 })

// Ahead of the behaviour tests: each ⋯ must render for the first time here, or React would already have warned.
describe('no ref warning on render', () => {
  it.each([
    ['/recipes/2', () => findTrigger('Weitere Aktionen')],
    ['/categories', () => findTrigger('Aktionen für „Favoriten“')],
    ['/categories/1', () => findTrigger('Weitere Aktionen')],
    ['/recipes/new', titleField],
    ['/recipes/2/edit', titleField],
  ])(
    '%s',
    async (path, ready) => {
      const before = consoleError.mock.calls.length
      renderAt(path)
      await ready()
      expect(refWarnings(before)).toEqual([])
    },
    SLOW,
  )
})

describe('the ⋯ behind a tooltip', () => {
  it.each([
    ['/recipes/2', 'Weitere Aktionen', 'Weitere Aktionen'],
    ['/categories', 'Aktionen für „Favoriten“', 'Aktionen'],
    ['/categories/1', 'Weitere Aktionen', 'Weitere Aktionen'],
  ])(
    '%s: tooltip on focus, the menu replaces it on click',
    async (path, name, tooltip) => {
      renderAt(path)
      const trigger = await findTrigger(name)
      fireEvent.focus(trigger)
      expect((await screen.findByRole('tooltip')).textContent).toContain(tooltip)
      fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' })
      fireEvent.click(trigger)
      await screen.findByRole('menu')
      await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())
    },
    SLOW,
  )

  // Categories has this already (Categories.mock.test).
  it.each(['/recipes/2', '/categories/1'])(
    '%s: Escape closes the menu and returns focus to ⋯',
    async (path) => {
      renderAt(path)
      const trigger = await findTrigger('Weitere Aktionen')
      fireEvent.keyDown(trigger, { key: 'Enter' })
      fireEvent.keyDown(await screen.findByRole('menu'), { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
      await waitFor(() => expect(document.activeElement).toBe(trigger))
    },
    SLOW,
  )
})
