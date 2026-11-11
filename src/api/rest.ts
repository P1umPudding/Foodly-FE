// REST transport to the backend. Same-origin in dev (Vite proxy); base URL from
// VITE_API_URL. The bearer comes from the session (auth.ts); a 401 triggers one
// refresh and one retry.
// Mirrors SocketClient.request's contract: resolves the parsed body, throws Error
// on failure, so useRequest/useRecipeSearch error handling is transport-agnostic.

import { currentAccessToken, expireIfCurrent, refreshAfterUnauthorized, session, tokenForRequest } from './auth'
import { apiUrl, errorMessage } from './http'
import type { PaginatedResponse } from './protocol'

export { apiUrl }

type SendInit = { method?: string; headers?: Record<string, string>; body?: BodyInit }

const withBearer = (init: SendInit, token: string | null): RequestInit =>
  token === null ? init : { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } }

// The one path for all request kinds. /auth/* never refreshes or retries, so a rejected refresh can't loop.
async function send(path: string, init: SendInit): Promise<Response> {
  if (path.startsWith('/auth/')) return fetch(apiUrl(path), init)
  const sentFor = session()?.userId
  const known = currentAccessToken()
  const { token, refreshError } =
    known !== undefined ? { token: known, refreshError: undefined } : await tokenForRequest()
  const res = await fetch(apiUrl(path), withBearer(init, token))
  if (res.status !== 401 || token === null || sentFor === undefined) return res

  const fresh = await refreshAfterUnauthorized(token, sentFor, refreshError)
  if (fresh === null) return res
  const retried = await fetch(apiUrl(path), withBearer(init, fresh))
  // A fresh token that still gets 401 means the session is gone server-side.
  if (retried.status === 401) expireIfCurrent(fresh)
  return retried
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await send(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) throw new Error(await errorMessage(res))

  // DELETE bodies are never parsed: whether the backend answers 204 or an empty 200
  // is unconfirmed, and a parse error would report a delete that already happened as failed.
  if (res.status === 204 || method === 'DELETE') return undefined as T
  return (await res.json()) as T
}

// The backend reads POST /images as a raw binary body, not JSON — request()
// always sets Content-Type: application/json when a body is present, so this
// can't reuse it.
async function requestBinary<T>(path: string, blob: Blob): Promise<T> {
  const res = await send(path, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob })
  if (!res.ok) throw new Error(await errorMessage(res))
  return (await res.json()) as T
}

// Binary GETs (tag icons): the routes need the bearer, which an <img src> can't send.
async function requestBlob(path: string): Promise<Blob> {
  const res = await send(path, {})
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.blob()
}

export const rest = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: (path: string) => request<void>('DELETE', path),
  postBinary: <T>(path: string, blob: Blob) => requestBinary<T>(path, blob),
  getBlob: (path: string) => requestBlob(path),
}

// Drain a cursor-paginated endpoint into a single list. The backend sets
// `cursor` to the next page number (as a string) while more pages remain and
// `null` on the last page, so the loop terminates. Used for reads whose callers
// want the whole collection (e.g. categories) rather than one page at a time.
export async function collectPages<T>(fetchPage: (page: number) => Promise<PaginatedResponse<T>>): Promise<T[]> {
  const all: T[] = []
  let page = 1
  for (;;) {
    const res = await fetchPage(page)
    all.push(...res.data)
    if (!res.cursor) break
    page = Number(res.cursor)
  }
  return all
}
