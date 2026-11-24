// Guard for `vite build --mode native`: the app in the native shell has no dev proxy and runs under its own origin,
// so it needs mock data or an absolute backend URL. Lives in src/ (not vite.config.ts) so tsc and vitest cover it.

export interface NativeEnv {
  VITE_MOCK?: string
  VITE_API_URL?: string
}

export function nativeEnvError(env: NativeEnv): string | null {
  if (env.VITE_MOCK === '1' || /^https?:\/\//.test(env.VITE_API_URL?.trim() ?? '')) return null
  return (
    'Native build needs VITE_MOCK=1 (default from .env.native) or an absolute VITE_API_URL. ' +
    'For a REST build create .env.native.local with VITE_MOCK= and VITE_API_URL=https://…/api/v1 (docs/native.md).'
  )
}

// The committed androidScheme is https, so an http:// backend is blocked as mixed content (only the LAN test
// with androidScheme 'http' can use it, docs/native.md).
export function nativeEnvWarning(env: NativeEnv): string | null {
  return env.VITE_MOCK !== '1' && /^http:\/\//.test(env.VITE_API_URL?.trim() ?? '')
    ? 'Native build with an http:// VITE_API_URL: only works with androidScheme "http" (LAN test, docs/native.md).'
    : null
}
