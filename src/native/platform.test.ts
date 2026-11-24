import { isNative, platform } from './platform'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('platform', () => {
  it('reports the web without the native shell', () => {
    expect(isNative()).toBe(false)
    expect(platform()).toBe('web')
  })

  it('reads the injected Capacitor global', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'android' })
    expect(isNative()).toBe(true)
    expect(platform()).toBe('android')
  })

  it('falls back to the web for a partial or unknown shell', () => {
    vi.stubGlobal('Capacitor', { getPlatform: () => 'electron' })
    expect(isNative()).toBe(false)
    expect(platform()).toBe('web')
  })
})
