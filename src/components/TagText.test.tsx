import { StrictMode } from 'react'
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

const originalCreateObjectURL = URL.createObjectURL

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:vegan')
})

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
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

  it('loads once under StrictMode and renders the icon', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(iconResponse())
    render(
      <StrictMode>
        <TagText value="{vegan} {vegan}" />
      </StrictMode>,
    )
    expect(await screen.findAllByRole('img', { name: 'vegan' })).toHaveLength(2)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('shows the icon for a second component mounted after the load settled', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(iconResponse())
    const { rerender } = render(<TagText value="{vegan}" />)
    await screen.findByRole('img', { name: 'vegan' })
    rerender(<TagText value="{Ofen} {vegan}" />)
    expect(screen.getByRole('img', { name: 'vegan' }).getAttribute('src')).toBe('blob:vegan')
  })

  it('drops the icon when the text no longer names the tag', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(iconResponse())
    const { container, rerender } = render(<TagText value="{vegan}" />)
    await screen.findByRole('img', { name: 'vegan' })
    rerender(<TagText value="{Ofen}" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.textContent).toBe('Ofen')
  })

  it('remembers a broken image for every other use of the tag', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(iconResponse())
    const { container, rerender } = render(<TagText value="{vegan}" />)
    fireEvent.error(await screen.findByRole('img', { name: 'vegan' }))
    rerender(<TagText value="{vegan} {vegan}" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.textContent).toBe('vegan vegan')
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
