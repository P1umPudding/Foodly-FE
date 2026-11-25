const open = vi.hoisted(() => vi.fn<(options: { url: string }) => Promise<void>>())
vi.mock('@capacitor/browser', () => ({ Browser: { open } }))

import { openExternal } from './openExternal'

beforeEach(() => {
  open.mockReset().mockResolvedValue(undefined)
})

describe('openExternal', () => {
  it('opens the url in the in-app browser', async () => {
    openExternal('https://example.com/x')
    await vi.waitFor(() => expect(open).toHaveBeenCalledWith({ url: 'https://example.com/x' }))
  })

  // An unhandled rejection would fail the run (Vitest reports it as an error).
  it('swallows a failing open', async () => {
    open.mockRejectedValueOnce(new Error('nope'))

    openExternal('https://example.com/x')
    await vi.waitFor(() => expect(open).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})
