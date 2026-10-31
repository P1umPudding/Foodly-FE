import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TagText } from './TagText'
import { resetTagIconCache } from '../api/assets'

// Vitest runs in REST mode (VITE_MOCK unset), so icons load as blobs over fetch.
vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({
    byId: { vegan: { id: 'vegan', svg: 'abc' }, Ofen: { id: 'Ofen', svg: null } },
    status: 'ready',
  }),
}))

function iconResponse(): Response {
  return { ok: true, status: 200, blob: async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }) } as Response
}

const notFound = {
  ok: false,
  status: 404,
  json: async () => ({ error: { message: 'Tag has no icon' } }),
} as unknown as Response

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:vegan')
})

afterEach(() => {
  vi.restoreAllMocks()
  resetTagIconCache()
})

describe('TagText tag icons in REST mode', () => {
  it('shows the name while the icon loads, then the icon', async () => {
    let resolve!: (r: Response) => void
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((r) => (resolve = r)))
    const { container } = render(<TagText value="Ganz {vegan}" />)
    expect(container.textContent).toBe('Ganz vegan')
    expect(screen.queryByRole('img')).toBeNull()

    resolve(iconResponse())
    const img = await screen.findByRole('img', { name: 'vegan' })
    expect(img.getAttribute('src')).toBe('blob:vegan')
    expect(container.textContent).toBe('Ganz ')
  })

  it('falls back to the name when the icon fails to load', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(notFound)
    const { container } = render(<TagText value="{vegan}" />)
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(container.textContent).toBe('vegan'))
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('falls back to the name when the image itself errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(iconResponse())
    const { container } = render(<TagText value="{vegan}" />)
    fireEvent.error(await screen.findByRole('img', { name: 'vegan' }))
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.textContent).toBe('vegan')
  })

  it('shows the name without a request for tags without an icon or forced names', () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const { container } = render(<TagText value="{Ofen} und {!vegan}" />)
    expect(container.textContent).toBe('Ofen und vegan')
    expect(spy).not.toHaveBeenCalled()
  })
})
