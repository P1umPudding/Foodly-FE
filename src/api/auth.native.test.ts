import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jwt, jsonResponse } from '../test/auth'

// The native app keeps the session in Preferences (mocked here; the real src/native/storage.ts runs on top).
const prefs = vi.hoisted(() => ({
  store: new Map<string, string>(),
  get: vi.fn<(o: { key: string }) => Promise<{ value: string | null }>>(),
  set: vi.fn<(o: { key: string; value: string }) => Promise<void>>(),
  remove: vi.fn<(o: { key: string }) => Promise<void>>(),
}))
vi.mock('@capacitor/preferences', () => ({ Preferences: { get: prefs.get, set: prefs.set, remove: prefs.remove } }))

type Auth = typeof import('./auth')
type Stored = { accessToken: string; refreshToken: string; userId: number; email?: string }

const KEY = 'foodly.auth'
const inPrefs = (): Stored | null => {
  const raw = prefs.store.get(KEY)
  return raw ? (JSON.parse(raw) as Stored) : null
}
const session = (over: Partial<Stored> = {}): Stored => ({
  accessToken: jwt(900),
  refreshToken: 'refresh-1',
  userId: 1,
  ...over,
})
const isUrl = (url: unknown, end: string) => String(url).endsWith(end)

// A fresh module graph = an app restart; Preferences (the map) survives it.
async function start(): Promise<{ auth: Auth; rest: (typeof import('./rest'))['rest'] }> {
  vi.resetModules()
  const [auth, { rest }] = await Promise.all([import('./auth'), import('./rest')])
  return { auth, rest }
}

async function startLoaded() {
  const app = await start()
  await app.auth.loadSession()
  return app
}

// The next Preferences write lands only when the returned function is called.
function slowNextWrite(): () => void {
  let finish!: () => void
  prefs.set.mockImplementationOnce(
    ({ key, value }) =>
      new Promise<void>((resolve) => {
        finish = () => {
          prefs.store.set(key, value)
          resolve()
        }
      }),
  )
  return () => finish()
}

function signInResponse(refreshToken = 'refresh-1', userId = 1) {
  return jsonResponse(200, { accessToken: jwt(900), refreshToken, user: { id: userId, name: 'X' } })
}

beforeEach(() => {
  prefs.store.clear()
  prefs.get.mockReset().mockImplementation(({ key }) => Promise.resolve({ value: prefs.store.get(key) ?? null }))
  prefs.set.mockReset().mockImplementation(({ key, value }) => {
    prefs.store.set(key, value)
    return Promise.resolve()
  })
  prefs.remove.mockReset().mockImplementation(({ key }) => {
    prefs.store.delete(key)
    return Promise.resolve()
  })
  vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'ios' })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('native session storage', () => {
  it('signs in into Preferences, not localStorage, and is still signed in after a restart', async () => {
    const { auth } = await startLoaded()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(signInResponse())

    await auth.signIn('a@b.de', 'pw')

    expect(inPrefs()).toMatchObject({ refreshToken: 'refresh-1', userId: 1, email: 'a@b.de' })
    expect(localStorage.getItem(KEY)).toBeNull()

    localStorage.clear()
    const restarted = await start()
    expect(restarted.auth.session()).toBeNull()
    await restarted.auth.loadSession()
    expect(restarted.auth.session()).toEqual({ userId: 1 })
  })

  it('tells subscribers about the loaded session', async () => {
    prefs.store.set(KEY, JSON.stringify(session({ userId: 3 })))
    const { auth } = await start()
    const listener = vi.fn()
    const unsubscribe = auth.subscribe(listener)

    await auth.loadSession()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ userId: 3 }, undefined)
    unsubscribe()
  })

  it('resolves sign-in only after the session is in Preferences', async () => {
    const { auth } = await startLoaded()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(signInResponse())
    const finish = slowNextWrite()
    let done = false
    const signedIn = auth.signIn('a@b.de', 'pw').then(() => (done = true))

    await vi.waitFor(() => expect(prefs.set).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(done).toBe(false)
    expect(auth.session()).toEqual({ userId: 1 })

    finish()
    await signedIn
    expect(inPrefs()?.userId).toBe(1)
  })

  it('stops waiting for a write that never finishes', async () => {
    prefs.store.set(KEY, JSON.stringify(session({ accessToken: jwt(-60) })))
    const { auth } = await startLoaded()
    const fresh = jwt(900)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { accessToken: fresh, refreshToken: 'r2' }))
    prefs.set.mockImplementationOnce(() => new Promise(() => {}))
    vi.useFakeTimers()

    let settled = false
    const pending = auth.getAccessToken().finally(() => (settled = true))
    await vi.advanceTimersByTimeAsync(2999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    expect(await pending).toBe(fresh)
    expect(console.warn).toHaveBeenCalled()
  })

  it('removes the entry on sign-out', async () => {
    prefs.store.set(KEY, JSON.stringify(session()))
    const { auth } = await startLoaded()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(204))

    await auth.signOut()

    expect(prefs.store.has(KEY)).toBe(false)
    expect(auth.session()).toBeNull()
  })

  it('ends up signed out when signing out right after a sign-in whose write is slow', async () => {
    const { auth } = await startLoaded()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      isUrl(url, '/auth/login') ? signInResponse() : jsonResponse(204),
    )
    const finish = slowNextWrite()

    const signedIn = auth.signIn('a@b.de', 'pw')
    await vi.waitFor(() => expect(prefs.set).toHaveBeenCalled())
    const signedOut = auth.signOut()
    finish()
    await Promise.all([signedIn, signedOut])

    expect(prefs.store.has(KEY)).toBe(false)
  })

  it('removes the entry when the refresh token has expired', async () => {
    prefs.store.set(KEY, JSON.stringify(session({ accessToken: jwt(-60) })))
    const { auth } = await startLoaded()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401))

    await auth.getAccessToken()

    await vi.waitFor(() => expect(prefs.store.has(KEY)).toBe(false))
    expect(auth.session()).toBeNull()
  })

  it('returns a refreshed token only after the new refresh token is in Preferences', async () => {
    prefs.store.set(KEY, JSON.stringify(session({ accessToken: jwt(-60) })))
    const { auth } = await startLoaded()
    const fresh = jwt(900)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { accessToken: fresh, refreshToken: 'r2' }))
    const finish = slowNextWrite()
    let token: string | null | undefined
    const pending = auth.getAccessToken().then((t) => (token = t))

    await vi.waitFor(() => expect(prefs.set).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(token).toBeUndefined()
    finish()
    await pending

    expect(token).toBe(fresh)
    expect(inPrefs()?.refreshToken).toBe('r2')
  })

  it('sends the retried request only after the new refresh token is in Preferences', async () => {
    prefs.store.set(KEY, JSON.stringify(session()))
    const { rest } = await startLoaded()
    let retriedWith: string | null = null
    let first = true
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (isUrl(url, '/auth/refresh')) return jsonResponse(200, { accessToken: jwt(900), refreshToken: 'r2' })
      if (first) {
        first = false
        return jsonResponse(401)
      }
      retriedWith = inPrefs()?.refreshToken ?? null
      return jsonResponse(200, { ok: true })
    })
    const finish = slowNextWrite()

    const request = rest.get('/things')
    await vi.waitFor(() => expect(prefs.set).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetch).toHaveBeenCalledTimes(2)
    finish()
    await request

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(retriedWith).toBe('r2')
  })

  it('yields no token when signed out while the refreshed session is being written', async () => {
    prefs.store.set(KEY, JSON.stringify(session({ accessToken: jwt(-60) })))
    const { auth } = await startLoaded()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      isUrl(url, '/auth/refresh')
        ? jsonResponse(200, { accessToken: jwt(900), refreshToken: 'r2' })
        : jsonResponse(204),
    )
    const finish = slowNextWrite()
    const pending = auth.getAccessToken()
    await vi.waitFor(() => expect(prefs.set).toHaveBeenCalled())

    const signedOut = auth.signOut()
    finish()

    expect(await pending).toBeNull()
    await signedOut
    expect(prefs.store.has(KEY)).toBe(false)
  })

  it('keeps the refreshed token when Preferences cannot be written', async () => {
    prefs.store.set(KEY, JSON.stringify(session({ accessToken: jwt(-60) })))
    const { auth } = await startLoaded()
    const fresh = jwt(900)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { accessToken: fresh, refreshToken: 'r2' }))
    prefs.set.mockImplementationOnce(() => Promise.reject(new Error('disk full')))

    expect(await auth.getAccessToken()).toBe(fresh)
    expect(console.warn).toHaveBeenCalled()
  })
})

describe('native session load', () => {
  it('moves a session from localStorage to Preferences', async () => {
    localStorage.setItem(KEY, JSON.stringify(session({ userId: 2 })))
    const { auth } = await startLoaded()

    expect(auth.session()).toEqual({ userId: 2 })
    await vi.waitFor(() => expect(localStorage.getItem(KEY)).toBeNull())
    expect(inPrefs()?.userId).toBe(2)
  })

  it('prefers Preferences over localStorage and drops the old copy', async () => {
    prefs.store.set(KEY, JSON.stringify(session({ userId: 3 })))
    localStorage.setItem(KEY, JSON.stringify(session({ userId: 2 })))
    const { auth } = await startLoaded()

    expect(auth.session()).toEqual({ userId: 3 })
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('drops a corrupt localStorage value without moving it', async () => {
    localStorage.setItem(KEY, '{not json')
    const { auth } = await startLoaded()

    expect(auth.session()).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(prefs.set).not.toHaveBeenCalled()
  })

  it('keeps the localStorage copy when moving it fails, and drops it on sign-out', async () => {
    localStorage.setItem(KEY, JSON.stringify(session({ userId: 2 })))
    prefs.set.mockImplementationOnce(() => Promise.reject(new Error('disk full')))
    const { auth } = await startLoaded()

    expect(auth.session()).toEqual({ userId: 2 })
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalled())
    expect(localStorage.getItem(KEY)).not.toBeNull()

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(204))
    await auth.signOut()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('counts a failed load as signed out and removes nothing', async () => {
    localStorage.setItem(KEY, JSON.stringify(session({ userId: 2 })))
    prefs.get.mockImplementationOnce(() => Promise.reject(new Error('bridge')))
    const { auth } = await startLoaded()

    expect(auth.session()).toBeNull()
    expect(localStorage.getItem(KEY)).not.toBeNull()
  })

  it('gives up on a load that does not answer within 3 s, and ignores a late answer', async () => {
    let answer!: (v: { value: string | null }) => void
    prefs.get.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
    const { auth } = await start()
    vi.useFakeTimers()

    const listener = vi.fn()
    const unsubscribe = auth.subscribe(listener)

    const loading = auth.loadSession()
    await vi.advanceTimersByTimeAsync(3000)
    await loading
    expect(auth.session()).toBeNull()

    answer({ value: JSON.stringify(session()) })
    await vi.advanceTimersByTimeAsync(0)
    expect(auth.session()).toBeNull()
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('keeps a session written while the load was still running', async () => {
    prefs.store.set(KEY, JSON.stringify(session({ userId: 2 })))
    let answer!: (v: { value: string | null }) => void
    prefs.get.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
    const { auth } = await start()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(signInResponse('refresh-9', 5))

    const loading = auth.loadSession()
    await auth.signIn('a@b.de', 'pw')
    answer({ value: prefs.store.get(KEY) ?? null })
    await loading

    expect(auth.session()).toEqual({ userId: 5 })
    expect(inPrefs()?.userId).toBe(5)
  })
})
