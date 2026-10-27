// Vite `base` for the Skaile preview, which serves the app under a proxy
// sub-path. Lives in src/ (not vite.config.ts) so tsc and vitest cover it.

export function previewBase(raw: string | undefined): string {
  const path = (raw ?? '').trim().replace(/^\/+|\/+$/g, '')
  return path ? `/${path}/` : '/'
}
