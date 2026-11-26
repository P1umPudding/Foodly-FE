import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import swSource from '../public/sw.js?raw'
import { buildBase } from './nativeBuild'
import { registerServiceWorker } from './serviceWorker'

const register = vi.fn<(url: string) => Promise<unknown>>()

function webProduction() {
  vi.stubEnv('PROD', true)
  vi.stubEnv('MODE', 'production')
}

function setReadyState(state: DocumentReadyState) {
  Object.defineProperty(document, 'readyState', { value: state, configurable: true })
}

beforeEach(() => {
  register.mockReset().mockResolvedValue({})
  Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'serviceWorker')
  Reflect.deleteProperty(document, 'readyState')
})

describe('registerServiceWorker', () => {
  it('stays off outside a production build (dev, tests)', () => {
    vi.stubEnv('PROD', false)
    registerServiceWorker()
    expect(register).not.toHaveBeenCalled()
  })

  it('registers sw.js once in the web production build', () => {
    webProduction()
    registerServiceWorker()
    expect(register).toHaveBeenCalledExactlyOnceWith('/sw.js')
  })

  it('stays off in the native build and in the Capacitor shell', () => {
    webProduction()
    vi.stubEnv('MODE', 'native')
    registerServiceWorker()
    vi.stubEnv('MODE', 'production')
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true })
    registerServiceWorker()
    expect(register).not.toHaveBeenCalled()
  })

  it('does nothing where service workers are unsupported', () => {
    webProduction()
    Reflect.deleteProperty(navigator, 'serviceWorker')
    expect(() => registerServiceWorker()).not.toThrow()
    expect(register).not.toHaveBeenCalled()
  })

  it('prefixes the worker URL with BASE_URL (the sub-path buildBase sets)', () => {
    webProduction()
    vi.stubEnv('BASE_URL', buildBase('production', '/preview/abc'))
    registerServiceWorker()
    expect(register).toHaveBeenCalledExactlyOnceWith('/preview/abc/sw.js')
  })

  it('waits for the load event while the page is still loading', () => {
    webProduction()
    setReadyState('loading')
    registerServiceWorker()
    expect(register).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('load'))
    window.dispatchEvent(new Event('load'))
    expect(register).toHaveBeenCalledOnce()
  })

  it('logs a failed registration instead of throwing', async () => {
    webProduction()
    const error = new Error('blocked')
    register.mockRejectedValue(error)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    registerServiceWorker()
    await vi.waitFor(() => expect(log).toHaveBeenCalledWith(error))
  })
})

describe('public/sw.js', () => {
  it('takes over at once and passes every request through untouched', () => {
    expect(swSource).toContain('skipWaiting()')
    expect(swSource).toContain('clients.claim()')
    expect(swSource).toContain("addEventListener('fetch'")
    for (const banned of ['caches', 'respondWith(', 'importScripts']) {
      expect(swSource.replace(/^\/\/.*$/gm, '')).not.toContain(banned)
    }
  })
})
