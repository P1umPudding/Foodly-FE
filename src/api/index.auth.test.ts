import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, seedSession, storedSession } from '../test/auth'

const originalCreateObjectURL = URL.createObjectURL

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  localStorage.clear()
})

// The mode is read when the modules load, so each case pins it and imports a fresh graph.
async function load(mode: 'rest' | 'mock') {
  vi.stubEnv('VITE_MOCK', mode === 'mock' ? '1' : '')
  vi.resetModules()
  const [{ foodly }, stubs, assets] = await Promise.all([import('./index'), import('./stubs'), import('./assets')])
  return { foodly, stubs, assets }
}

const vegan = { id: 'vegan', svg: 'abc123' }

describe('foodly.auth in REST mode', () => {
  async function signedInWithCaches() {
    seedSession({ userId: 4 })
    const loaded = await load('rest')
    URL.createObjectURL = vi.fn(() => 'blob:icon')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }),
    } as unknown as Response)
    await loaded.assets.loadTagIcon(vegan)
    loaded.stubs.setStubUser(4)
    expect(loaded.assets.peekTagIcon(vegan)).toBe('blob:icon')
    return loaded
  }

  it('signOut clears session and caches even when the logout request fails', async () => {
    const { foodly, stubs, assets } = await signedInWithCaches()
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(foodly.auth.signOut()).resolves.toBeUndefined()
    expect(storedSession()).toBeNull()
    expect(foodly.auth.session()).toBeNull()
    expect(stubs.stubUserId()).toBeNull()
    expect(assets.peekTagIcon(vegan)).toBeUndefined()
  })

  it('signOut resets right away, while the logout request is still pending', async () => {
    const { foodly, stubs, assets } = await signedInWithCaches()
    vi.mocked(globalThis.fetch).mockReturnValue(new Promise<Response>(() => {}))

    void foodly.auth.signOut()
    expect(storedSession()).toBeNull()
    expect(stubs.stubUserId()).toBeNull()
    expect(assets.peekTagIcon(vegan)).toBeUndefined()
  })

  it('an expired session resets the caches too', async () => {
    const { foodly, stubs, assets } = await signedInWithCaches()
    vi.mocked(globalThis.fetch).mockImplementation(async () => jsonResponse(401, {}))

    await expect(foodly.listTags()).rejects.toThrow()
    expect(foodly.auth.session()).toBeNull()
    expect(stubs.stubUserId()).toBeNull()
    expect(assets.peekTagIcon(vegan)).toBeUndefined()
  })

  it('switching straight to another user resets the caches', async () => {
    const { foodly, stubs, assets } = await signedInWithCaches()
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { user: { id: 9, name: 'C', profilePicture: null }, accessToken: 'a', refreshToken: 'r' }),
    )
    await foodly.auth.signIn('user3@example.com', 'password123')
    expect(foodly.auth.session()).toEqual({ userId: 9 })
    expect(stubs.stubUserId()).toBeNull()
    expect(assets.peekTagIcon(vegan)).toBeUndefined()
  })

  it('signIn stores the session and reports it', async () => {
    const { foodly } = await load('rest')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(200, { user: { id: 2, name: 'B', profilePicture: null }, accessToken: 'a', refreshToken: 'r' }),
    )
    await expect(foodly.auth.signIn('user2@example.com', 'password123')).resolves.toEqual({ userId: 2 })
    expect(foodly.auth.session()).toEqual({ userId: 2 })
  })
})

describe('foodly.auth in mock mode', () => {
  it('is always signed in as the mock user and never calls the backend', async () => {
    const { foodly } = await load('mock')
    const { CURRENT_USER_ID } = await import('../mocks')
    const spy = vi.spyOn(globalThis, 'fetch')

    expect(foodly.auth.session()).toEqual({ userId: CURRENT_USER_ID })
    expect(foodly.auth.session()).toBe(foodly.auth.session())
    await expect(foodly.auth.signIn('x@example.com', 'whatever')).resolves.toEqual({ userId: CURRENT_USER_ID })
    await expect(foodly.auth.signUp('X', 'x@example.com', 'whatever')).resolves.toEqual({ userId: CURRENT_USER_ID })
    await foodly.auth.signOut()
    expect(foodly.auth.session()).toEqual({ userId: CURRENT_USER_ID })
    const listener = vi.fn()
    foodly.auth.subscribe(listener)()
    expect(listener).not.toHaveBeenCalled()
    expect(spy).not.toHaveBeenCalled()
  })
})
