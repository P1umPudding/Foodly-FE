// `next` after sign-in may only point inside the app. "//host" and "/\host" are protocol-relative to a
// browser, and a cross-origin pushState throws instead of navigating.
const FALLBACK = '/recipes'

export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return FALLBACK
  if (raw.includes('\\') || /[\u0000-\u001f\u007f]/.test(raw)) return FALLBACK
  return raw
}
