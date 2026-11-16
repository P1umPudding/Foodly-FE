import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TagChips } from './TagChips'
import { resetTagIconCache } from '../../api/assets'

// The mode is read when the modules load, so pin REST before the imports run
// (vi.hoisted), whatever the shell env or .env.local sets.
vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))
vi.mock('../../catalog/CatalogProvider', () => ({
  useTags: () => ({
    byId: { vegan: { id: 'vegan', svg: 'abc' }, scharf: { id: 'scharf', svg: null } },
    status: 'ready',
  }),
}))

const originalCreateObjectURL = URL.createObjectURL

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:vegan')
})

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  vi.restoreAllMocks()
  resetTagIconCache()
})

afterAll(() => vi.unstubAllEnvs())

const icon = { ok: true, status: 200, blob: async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }) }
const chip = (name: string) => screen.getByText(name).parentElement!

describe('TagChips in REST mode', () => {
  it('renders every tag as a grey chip with its name', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    render(<TagChips tags={['vegan', 'scharf']} />)
    for (const name of ['vegan', 'scharf']) expect(chip(name).className).toContain('bg-tag')
  })

  it('puts the tag icon in front of the name once loaded; a tag without icon gets no placeholder', async () => {
    let resolve!: (r: Response) => void
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((r) => (resolve = r)))
    const { container } = render(<TagChips tags={['vegan', 'scharf']} />)
    expect(container.querySelector('img')).toBeNull()
    expect(chip('vegan').children).toHaveLength(1) // no slot while the icon loads

    resolve(icon as unknown as Response)
    await vi.waitFor(() => expect(chip('vegan').querySelector('img')?.getAttribute('src')).toBe('blob:vegan'))
    expect(container.textContent).toBe('veganscharf')
    expect(chip('scharf').querySelector('img')).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('drops a broken icon and keeps the name', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(icon as unknown as Response)
    const { container } = render(<TagChips tags={['vegan']} />)
    await vi.waitFor(() => expect(container.querySelector('img')).toBeTruthy())
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('vegan')
    // No empty icon slot left behind (it would add a gap in front of the name).
    expect(chip('vegan').children).toHaveLength(1)
  })

  it('truncates a long name: within the row cap in lists, within the available width elsewhere', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    const { unmount } = render(<TagChips tags={['scharf']} max={2} />)
    expect(screen.getByText('scharf').className).toContain('truncate')
    expect(chip('scharf').className).toContain('max-w-40')
    unmount()
    render(<TagChips tags={['scharf']} />)
    expect(chip('scharf').className).not.toContain('max-w-40')
    expect(chip('scharf').className).toContain('max-w-full')
  })

  it('caps the chips at `max`', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    const { container } = render(<TagChips tags={['vegan', 'scharf', 'neu']} max={2} />)
    expect(container.textContent).toBe('veganscharf')
  })

  it('renders nothing without tags', () => {
    const { container } = render(<TagChips tags={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
