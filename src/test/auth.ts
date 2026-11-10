// Session fixtures for tests that touch src/api/auth.ts.

const base64url = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

let issued = 0

// An unsigned, unique JWT that expires `secondsFromNow` from now (negative = already expired).
export function jwt(secondsFromNow: number, claims: Record<string, unknown> = {}): string {
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: '1', exp, jti: ++issued, ...claims })}.sig`
}

type Stored = { accessToken: string; refreshToken: string; userId: number }

export function seedSession(session: Partial<Stored> = {}): Stored {
  const stored = { accessToken: jwt(900), refreshToken: 'refresh-1', userId: 1, ...session }
  localStorage.setItem('foodly.auth', JSON.stringify(stored))
  return stored
}

export function storedSession(): Stored | null {
  const raw = localStorage.getItem('foodly.auth')
  return raw ? (JSON.parse(raw) as Stored) : null
}

export function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}
