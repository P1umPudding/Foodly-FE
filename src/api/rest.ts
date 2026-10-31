// REST transport to the backend. Same-origin in dev (Vite proxy); base URL from
// VITE_API_URL. Auth is a static bearer — the backend maps any bearer to user 1.
// Mirrors SocketClient.request's contract: resolves the parsed body, throws Error
// on failure, so useRequest/useRecipeSearch error handling is transport-agnostic.

import type { PaginatedResponse } from './protocol'

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'
const DEV_TOKEN = 'dev-token'

export const apiUrl = (path: string) => `${BASE}${path}`

async function errorMessage(res: Response): Promise<string> {
  try {
    const parsed = (await res.json()) as { error?: { message?: string } }
    if (parsed?.error?.message) return parsed.error.message
  } catch {
    // non-JSON error body — fall back to the status
  }
  return `HTTP ${res.status}`
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: {
      Authorization: `Bearer ${DEV_TOKEN}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
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
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { Authorization: `Bearer ${DEV_TOKEN}`, 'Content-Type': blob.type },
    body: blob,
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return (await res.json()) as T
}

// Binary GETs (tag icons): the routes need the bearer, which an <img src> can't send.
async function requestBlob(path: string): Promise<Blob> {
  const res = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${DEV_TOKEN}` } })
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
