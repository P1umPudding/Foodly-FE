// Guard for `vite build --mode native`: the app in the native shell has no dev proxy and runs under its own origin,
// so it needs mock data or an absolute backend URL. Lives in src/ (not vite.config.ts) so tsc and vitest cover it.

import { previewBase } from './previewBase'

export interface NativeEnv {
  VITE_MOCK?: string
  VITE_API_URL?: string
}

// The Capacitor shell serves dist/ from its own root, never under the preview sub-path.
export function buildBase(mode: string, previewBaseEnv: string | undefined): string {
  return mode === 'native' ? '/' : previewBase(previewBaseEnv)
}

function restUrl(env: NativeEnv): URL | null {
  if (env.VITE_MOCK === '1') return null
  const raw = env.VITE_API_URL?.trim() ?? ''
  if (!URL.canParse(raw)) return null
  const url = new URL(raw)
  return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
}

export function nativeEnvError(env: NativeEnv): string | null {
  if (env.VITE_MOCK === '1' || restUrl(env)) return null
  return (
    'Native build needs VITE_MOCK=1 (default from .env.native) or an absolute VITE_API_URL. ' +
    'For a REST build create .env.native.local with VITE_MOCK= and VITE_API_URL=https://…/api/v1 (docs/native.md).'
  )
}

// Warnings, not errors: both cases are valid for a local test (the iOS simulator reaches the Mac via localhost).
export function nativeEnvWarnings(env: NativeEnv): string[] {
  const url = restUrl(env)
  if (!url) return []
  const warnings: string[] = []
  if (url.protocol === 'http:') {
    // The committed androidScheme is https, so Android blocks an http:// backend as mixed content.
    warnings.push('Native build with an http:// VITE_API_URL: only works with androidScheme "http" (LAN test).')
  }
  if (url.hostname === 'localhost' || url.hostname === '[::1]' || /^127\./.test(url.hostname)) {
    warnings.push('Native build with a localhost VITE_API_URL: on a device that is the device itself (docs/native.md).')
  }
  return warnings
}
