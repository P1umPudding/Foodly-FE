// REST transport to the backend. Same-origin in dev (Vite proxy); base URL from
// VITE_API_URL. Auth is a static bearer — the backend maps any bearer to user 1.
// Mirrors SocketClient.request's contract: resolves the parsed body, throws Error
// on failure, so useRequest/useRecipeSearch error handling is transport-agnostic.

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'
const DEV_TOKEN = 'dev-token'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${DEV_TOKEN}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const parsed = (await res.json()) as { error?: { message?: string } }
      if (parsed?.error?.message) message = parsed.error.message
    } catch {
      // non-JSON error body — keep the status-based message
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const rest = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
}
