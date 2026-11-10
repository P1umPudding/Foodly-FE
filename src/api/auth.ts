// The session: the only place that reads or writes the tokens (localStorage["foodly.auth"]) and the only
// sender of /auth/*. Every access re-reads localStorage instead of caching, so a refresh or sign-out in
// another tab is seen without syncing a second copy.
//
// The backend rotates refresh tokens (a used one is invalid at once) and rate-limits /auth/refresh, so at
// most one refresh runs at a time: one shared promise per tab, a Web Lock across tabs.

import { apiUrl, errorMessage } from './http'
import type { AuthResponse, TokenPair, UserId } from './protocol'

const STORAGE_KEY = 'foodly.auth'
const REFRESH_LOCK = 'foodly-auth-refresh'
const EXPIRY_MARGIN_MS = 30_000
// A hanging refresh would otherwise hold the cross-tab lock forever.
const REFRESH_TIMEOUT_MS = 15_000

type StoredSession = TokenPair & { userId: UserId }
export type AuthSession = { userId: UserId }
export type SignedOutReason = 'expired' | 'signed-out'
export type AuthEvent = { type: 'signed-out'; reason: SignedOutReason }
export type AuthListener = (session: AuthSession | null, event?: AuthEvent) => void

function readStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<StoredSession> | null
    if (
      typeof value?.accessToken === 'string' &&
      typeof value.refreshToken === 'string' &&
      typeof value.userId === 'number'
    ) {
      return { accessToken: value.accessToken, refreshToken: value.refreshToken, userId: value.userId }
    }
  } catch {
    // unreadable or corrupt storage counts as signed out
  }
  return null
}

function writeStored(session: StoredSession | null): void {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  else localStorage.removeItem(STORAGE_KEY)
}

// Same object until the user changes, so useSyncExternalStore doesn't loop and a token refresh doesn't
// re-render subscribers.
let snapshot: AuthSession | null = null

export function session(): AuthSession | null {
  const userId = readStored()?.userId ?? null
  if ((snapshot?.userId ?? null) !== userId) snapshot = userId === null ? null : { userId }
  return snapshot
}

const listeners = new Set<AuthListener>()
let lastNotified: AuthSession | null = null

function notify(event?: AuthEvent): void {
  const current = session()
  if (!event && current === lastNotified) return
  lastNotified = current
  listeners.forEach((listener) => listener(current, event))
}

// Another tab signed in, out or refreshed. Its reason isn't stored, so an expiry there arrives here as
// a plain sign-out.
function onStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY && event.key !== null) return
  if (lastNotified !== null && session() === null) notify({ type: 'signed-out', reason: 'signed-out' })
  else notify()
}

export function subscribe(listener: AuthListener): () => void {
  if (listeners.size === 0) {
    lastNotified = session()
    window.addEventListener('storage', onStorage)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

// exp from the JWT payload (base64url), without verifying the signature: only used to refresh early.
function expiresAt(token: string): number | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const { exp } = JSON.parse(atob(base64)) as { exp?: unknown }
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

// Synchronous fast path: the stored token while it is valid for more than 30 s, null without a session,
// undefined when a refresh is due. Lets rest.ts call fetch() before its first await, which pendingSaves
// relies on (an unmount save goes out before the reads that follow it).
export function currentAccessToken(): string | null | undefined {
  const current = readStored()
  if (!current) return null
  const expires = expiresAt(current.accessToken)
  return expires !== null && expires - Date.now() > EXPIRY_MARGIN_MS ? current.accessToken : undefined
}

export async function getAccessToken(): Promise<string | null> {
  const known = currentAccessToken()
  if (known !== undefined) return known
  const current = readStored()
  if (!current) return null
  const expires = expiresAt(current.accessToken)
  try {
    return await refresh()
  } catch (error) {
    // Refresh failed (rate limit, network) but the token still works for a few seconds.
    if (expires !== null && expires > Date.now()) return current.accessToken
    throw error
  }
}

// A request answered 401 with `sentAccessToken`. If the stored token changed meanwhile, someone already
// refreshed, so only retry.
export function refreshAfterUnauthorized(sentAccessToken: string): Promise<string | null> {
  const current = readStored()
  if (!current) return Promise.resolve(null)
  if (current.accessToken !== sentAccessToken) return Promise.resolve(current.accessToken)
  return refresh()
}

// Compare-and-clear: another tab may have refreshed or signed in someone else since `accessToken` was sent.
export function expireIfCurrent(accessToken: string): void {
  if (readStored()?.accessToken !== accessToken) return
  writeStored(null)
  notify({ type: 'signed-out', reason: 'expired' })
}

let inflight: Promise<string | null> | null = null

// Assigned synchronously, so parallel callers in this tab always share one refresh.
function refresh(): Promise<string | null> {
  inflight ??= refreshOnce().finally(() => {
    inflight = null
  })
  return inflight
}

function refreshOnce(): Promise<string | null> {
  const sent = readStored()?.refreshToken
  if (sent === undefined) return Promise.resolve(null)
  // jsdom and older browsers have no Web Locks; then only the in-tab single flight applies.
  const locks = 'locks' in navigator ? navigator.locks : undefined
  if (!locks) return refreshLocked(sent)
  // The DOM typing resolves to the callback's promise itself; the lock actually awaits and unwraps it.
  return locks.request(REFRESH_LOCK, () => refreshLocked(sent)).then((pending) => pending)
}

async function refreshLocked(sent: string): Promise<string | null> {
  // Re-read after getting the lock: if another tab refreshed while we waited, use its token instead of
  // sending the now-invalid refresh token.
  const before = readStored()
  if (!before) return null
  if (before.refreshToken !== sent) return before.accessToken

  const res = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: sent }),
    signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
  })

  if (res.ok) {
    const { accessToken, refreshToken } = (await res.json()) as TokenPair
    // Signed out or in as someone else while the request ran: don't bring the old session back.
    const now = readStored()
    if (now?.refreshToken !== sent) return now?.accessToken ?? null
    writeStored({ accessToken, refreshToken, userId: now.userId })
    return accessToken
  }

  if (res.status === 401) {
    // A tab without Web Locks may have rotated the token first; then ours was just stale.
    const now = readStored()
    if (now && now.refreshToken !== sent) return now.accessToken
    if (now) {
      writeStored(null)
      notify({ type: 'signed-out', reason: 'expired' })
    }
    return null
  }

  throw new Error(await errorMessage(res))
}

async function startSession(path: string, body: object): Promise<AuthSession> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  const { accessToken, refreshToken, user } = (await res.json()) as AuthResponse
  writeStored({ accessToken, refreshToken, userId: user.id })
  notify()
  return session() ?? { userId: user.id }
}

export function signIn(email: string, password: string): Promise<AuthSession> {
  return startSession('/auth/login', { email, password })
}

export function signUp(name: string, email: string, password: string): Promise<AuthSession> {
  return startSession('/auth/register', { name, email, password })
}

// Clears locally first, so the guard and other tabs follow at once and a hanging or failing logout
// request can't keep anyone signed in. The access token is sent as is: refreshing just to log out would
// spend the rate limit.
export function signOut(): Promise<void> {
  const current = readStored()
  if (!current) return Promise.resolve()
  writeStored(null)
  notify({ type: 'signed-out', reason: 'signed-out' })
  return fetch(apiUrl('/auth/logout'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${current.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  }).then(
    () => undefined,
    () => undefined,
  )
}
