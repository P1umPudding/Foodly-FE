import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TagChips } from './TagChips'
import { resetTagIconCache } from '../../api/assets'

// REST mode (vitest default): icons load as blobs over fetch.
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

const icon = { ok: true, status: 200, blob: async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }) }

describe('TagChips in REST mode', () => {
  it('shows names while loading and swaps in the icon once loaded', async () => {
    let resolve!: (r: Response) => void
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((r) => (resolve = r)))
    const { container } = render(<TagChips tags={['vegan', 'scharf']} hoverName />)
    expect(container.textContent).toBe('veganscharf')
    expect(screen.queryByRole('img')).toBeNull()

    resolve(icon as unknown as Response)
    expect((await screen.findByRole('img', { name: 'vegan' })).getAttribute('src')).toBe('blob:vegan')
    expect(container.textContent).toBe('scharf')
  })

  it('falls back to the plain name when the icon cannot be shown', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(icon as unknown as Response)
    const { container } = render(<TagChips tags={['vegan']} hoverName />)
    fireEvent.error(await screen.findByRole('img', { name: 'vegan' }))
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.textContent).toBe('vegan')
    expect(container.querySelector('[data-state]')).toBeNull() // no tooltip trigger left
  })
})
