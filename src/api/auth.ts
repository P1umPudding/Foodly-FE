// The session: the only place that reads or writes the tokens and the only sender of /auth/*. On the web
// every access re-reads localStorage["foodly.auth"] instead of caching, so a refresh or sign-out in another
// tab is seen without syncing a second copy. The native app keeps it in memory, loaded once by loadSession()
// in bootstrap() and written through to Preferences (iOS may clear WebView storage, E5). Only the refreshing
// caller waits for that write; other requests may already send the new access token from memory.
//
// The backend rotates refresh tokens (a used one is invalid at once) and rate-limits /auth/refresh, so at
// most one refresh runs at a time: one shared promise per tab, a Web Lock across tabs.

import { apiError, apiUrl, errorMessage } from './http'
import { isNative } from '../native/platform'
import { loadAuth, saveAuth } from '../native/storage'
import type { AuthResponse, TokenPair, UserId } from './protocol'

const STORAGE_KEY = 'foodly.auth'
const REFRESH_LOCK = 'foodly-auth-refresh'
const EXPIRY_MARGIN_MS = 30_000
// A hanging refresh would otherwise hold the cross-tab lock forever.
const REFRESH_TIMEOUT_MS = 15_000
// The app renders only after bootstrap(); a native bridge that never answers must not leave it blank.
const LOAD_TIMEOUT_MS = 3_000

// The e-mail is only kept to prefill the sign-in page after an expiry; the backend's User has none.
type StoredSession = TokenPair & { userId: UserId; email?: string }
export type AuthSession = { userId: UserId }
export type SignedOutReason = 'expired' | 'signed-out'
export type SessionEnd = { reason: SignedOutReason; email?: string }
export type AuthEvent = { type: 'signed-out'; reason: SignedOutReason }
export type AuthListener = (session: AuthSession | null, event?: AuthEvent) => void

function parseStored(raw: string | null): StoredSession | null {
  try {
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<StoredSession> | null
    if (
      typeof value?.accessToken === 'string' &&
      typeof value.refreshToken === 'string' &&
      typeof value.userId === 'number'
    ) {
      const { accessToken, refreshToken, userId, email } = value
      return typeof email === 'string'
        ? { accessToken, refreshToken, userId, email }
        : { accessToken, refreshToken, userId }
    }
  } catch {
    // unreadable or corrupt storage counts as signed out
  }
  return null
}

function readLocal(): StoredSession | null {
  try {
    return parseStored(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

let nativeSession: StoredSession | null = null
// Set by the first native write: a load that finishes after it must not overwrite it.
let written = false

function readStored(): StoredSession | null {
  return isNative() ? nativeSession : readLocal()
}

// Never rejects: natively memory is the source of truth, and a lost write only means signing in again after a
// restart.
function writeStored(session: StoredSession | null): Promise<void> {
  if (!isNative()) {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
    return Promise.resolve()
  }
  nativeSession = session
  written = true
  // A legacy copy kept after a failed migration must not bring a signed-out session back.
  if (!session) localStorage.removeItem(STORAGE_KEY)
  return saveAuth(session ? JSON.stringify(session) : null).catch((error: unknown) =>
    console.warn('Could not save the session', error),
  )
}

// Native only: loads the session from Preferences before the first render. A session that only sits in
// localStorage (from before Preferences) moves over; a failed or hanging load counts as signed out.
export async function loadSession(): Promise<void> {
  if (!isNative()) return
  let timer: ReturnType<typeof setTimeout> | undefined
  let raw: string | null
  try {
    raw = await Promise.race([
      loadAuth(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timed out')), LOAD_TIMEOUT_MS)
      }),
    ])
  } catch (error) {
    console.warn('Could not load the session', error)
    return
  } finally {
    clearTimeout(timer)
  }
  if (written) return

  const stored = parseStored(raw)
  const legacy = readLocal()
  if (stored) {
    nativeSession = stored
    localStorage.removeItem(STORAGE_KEY)
  } else if (legacy) {
    nativeSession = legacy
    // Not awaited: the queue orders it before any later write, and a hanging bridge can't block the start.
    void saveAuth(JSON.stringify(legacy)).then(
      () => localStorage.removeItem(STORAGE_KEY),
      (error: unknown) => console.warn('Could not move the session to Preferences', error),
    )
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
  notify()
}

// Same object until the user changes, so useSyncExternalStore doesn't loop and a token refresh doesn't
// re-render subscribers.
let snapshot: AuthSession | null = null

export function session(): AuthSession | null {
  const userId = readStored()?.userId ?? null
  if ((snapshot?.userId ?? null) !== userId) snapshot = userId === null ? null : { userId }
  return snapshot
}

// How this tab's last session ended, for the guard's redirect target and the sign-in page's hint. Set
// before every notify, so a render triggered by it already sees the value. A sign-out in another tab
// leaves it null: its reason isn't stored.
let ended: SessionEnd | null = null

export function sessionEnd(): SessionEnd | null {
  return session() ? null : ended
}

// Tests only: module state, and clearing localStorage between tests doesn't notify.
export function resetSessionEnd(): void {
  ended = null
}

function endSession(end: SessionEnd): Promise<void> {
  const write = writeStored(null)
  ended = end
  notify({ type: 'signed-out', reason: end.reason })
  return write
}

const listeners = new Set<AuthListener>()
let lastNotified: AuthSession | null = null

function notify(event?: AuthEvent): void {
  const current = session()
  if (current) ended = null
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
  return (await tokenForRequest()).token
}

// Like getAccessToken, plus the error of a refresh that just failed for this token, so rest.ts doesn't
// try a second refresh on the 401 that follows (the backend rate-limits /auth/refresh).
export async function tokenForRequest(): Promise<{ token: string | null; refreshError?: unknown }> {
  const known = currentAccessToken()
  if (known !== undefined) return { token: known }
  const current = readStored()
  if (!current) return { token: null }
  try {
    return { token: await refresh() }
  } catch (refreshError) {
    // Refresh failed (rate limit, network, timeout). Send the old token and let the server judge it: the
    // local clock may be off, and a real expiry comes back as 401.
    return { token: current.accessToken, refreshError }
  }
}

// A request sent for `sentUserId` answered 401 with `sentAccessToken`. If the stored token changed
// meanwhile, someone already refreshed, so only retry. Never retry as a different user. With
// `refreshError` (the refresh for this request just failed) a second refresh would hit the same rate
// limit, so that error is thrown instead.
export function refreshAfterUnauthorized(
  sentAccessToken: string,
  sentUserId: UserId,
  refreshError?: unknown,
): Promise<string | null> {
  const current = readStored()
  if (current?.userId !== sentUserId) return Promise.resolve(null)
  if (current.accessToken !== sentAccessToken) return Promise.resolve(current.accessToken)
  if (refreshError !== undefined) return Promise.reject(refreshError)
  return refresh()
}

// Compare-and-clear: another tab may have refreshed or signed in someone else since `accessToken` was sent.
export function expireIfCurrent(accessToken: string): void {
  const current = readStored()
  if (current?.accessToken !== accessToken) return
  void endSession({ reason: 'expired', email: current.email })
}

type InflightRefresh = { refreshToken: string; promise: Promise<string | null> }
let inflight: InflightRefresh | null = null

// Assigned synchronously, so parallel callers in this tab always share one refresh. Only for the same
// refresh token: after a sign-in as someone else, the previous user's pending refresh is no answer.
function refresh(): Promise<string | null> {
  const stored = readStored()
  if (!stored) return Promise.resolve(null)
  if (inflight?.refreshToken === stored.refreshToken) return inflight.promise
  const entry: InflightRefresh = {
    refreshToken: stored.refreshToken,
    promise: refreshOnce({ refreshToken: stored.refreshToken, userId: stored.userId }).finally(() => {
      if (inflight === entry) inflight = null
    }),
  }
  inflight = entry
  return entry.promise
}

function refreshOnce(sent: { refreshToken: string; userId: UserId }): Promise<string | null> {
  // jsdom and older browsers have no Web Locks; then only the in-tab single flight applies.
  const locks = 'locks' in navigator ? navigator.locks : undefined
  if (!locks) return refreshLocked(sent)
  // The DOM typing resolves to the callback's promise itself; the lock actually awaits and unwraps it.
  return locks.request(REFRESH_LOCK, () => refreshLocked(sent)).then((pending) => pending)
}

// Someone else's token after a sign-in in another tab is no answer to this refresh.
const tokenOf = (session: StoredSession | null, userId: UserId) =>
  session?.userId === userId ? session.accessToken : null

async function refreshLocked(sent: { refreshToken: string; userId: UserId }): Promise<string | null> {
  // Re-read after getting the lock: if another tab refreshed while we waited, use its token instead of
  // sending the now-invalid refresh token.
  const before = readStored()
  if (before?.refreshToken !== sent.refreshToken) return tokenOf(before, sent.userId)

  const res = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: sent.refreshToken }),
    signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
  })

  if (res.ok) {
    const { accessToken, refreshToken } = (await res.json()) as TokenPair
    // Signed out or in as someone else while the request ran: don't bring the old session back.
    const now = readStored()
    if (now?.refreshToken !== sent.refreshToken) {
      // The rotated pair is dropped; revoke it so it doesn't stay valid on the server for 30 days.
      void logout({ accessToken, refreshToken })
      return tokenOf(now, sent.userId)
    }
    // The backend already invalidated the old refresh token: persist the new one before anyone uses it.
    await writeStored({ ...now, accessToken, refreshToken })
    return tokenOf(readStored(), sent.userId)
  }

  if (res.status === 401) {
    // A tab without Web Locks may have rotated the token first; then ours was just stale.
    const now = readStored()
    if (now && now.refreshToken !== sent.refreshToken) return tokenOf(now, sent.userId)
    if (now) void endSession({ reason: 'expired', email: now.email })
    return null
  }

  throw new Error(await errorMessage(res))
}

async function startSession(
  path: string,
  body: { name?: string; email: string; password: string },
): Promise<AuthSession> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await apiError(res)
  const { accessToken, refreshToken, user } = (await res.json()) as AuthResponse
  const replaced = readStored()
  const write = writeStored({ accessToken, refreshToken, userId: user.id, email: body.email })
  // Signed in over an existing session: revoke the old pair instead of leaving it valid for 30 days.
  if (replaced) void logout(replaced)
  notify()
  await write
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
  const write = endSession({ reason: 'signed-out' })
  return Promise.all([write, logout(current)]).then(() => undefined)
}

// Best effort: the session is already gone locally either way.
function logout({ accessToken, refreshToken }: TokenPair): Promise<void> {
  return fetch(apiUrl('/auth/logout'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).then(
    () => undefined,
    () => undefined,
  )
}
