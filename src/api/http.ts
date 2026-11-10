// Shared by rest.ts and auth.ts, so the REST client (which needs the session) and the session (which
// sends /auth/*) don't import each other.

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

export const apiUrl = (path: string) => `${BASE}${path}`

export async function errorMessage(res: Response): Promise<string> {
  try {
    const parsed = (await res.json()) as { error?: { message?: string } }
    if (parsed?.error?.message) return parsed.error.message
  } catch {
    // non-JSON error body — fall back to the status
  }
  return `HTTP ${res.status}`
}
