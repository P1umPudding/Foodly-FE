// Shared by rest.ts and auth.ts, so the REST client (which needs the session) and the session (which
// sends /auth/*) don't import each other.

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

export const apiUrl = (path: string) => `${BASE}${path}`

// Keeps the status and the backend's error code, so the sign-in pages can tell 401, 409, 422 and 429
// apart without matching on the (English, non-contractual) message.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiError(res: Response): Promise<ApiError> {
  try {
    const parsed = (await res.json()) as { error?: { code?: string; message?: string } }
    if (parsed?.error?.message) return new ApiError(parsed.error.message, res.status, parsed.error.code)
  } catch {
    // non-JSON error body — fall back to the status
  }
  return new ApiError(`HTTP ${res.status}`, res.status)
}

export async function errorMessage(res: Response): Promise<string> {
  return (await apiError(res)).message
}
