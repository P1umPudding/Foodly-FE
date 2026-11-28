// Offline settings (Phase 8): per device, not per user, so they live in localStorage outside the session. Anything
// unreadable falls back to the defaults field by field, so a newer or broken value never locks the profile page.
export type Transfer = 'wifi' | 'mobile'
export type ImageMode = 'off' | 'wifi' | 'always'

export type OfflineSettings = {
  enabled: boolean
  download: Transfer
  upload: Transfer
  images: ImageMode
  limitMb: number
}

export const LIMIT_MIN_MB = 200
export const LIMIT_MAX_MB = 5000
export const LIMIT_STEP_MB = 100

export const DEFAULT_OFFLINE_SETTINGS: OfflineSettings = {
  enabled: false,
  download: 'wifi',
  upload: 'wifi',
  images: 'wifi',
  limitMb: 1000,
}

const KEY = 'foodly.offline.settings'
const TRANSFERS: readonly string[] = ['wifi', 'mobile']
const IMAGE_MODES: readonly string[] = ['off', 'wifi', 'always']

export function clampLimit(mb: number): number {
  if (!Number.isFinite(mb)) return DEFAULT_OFFLINE_SETTINGS.limitMb
  const stepped = Math.round(mb / LIMIT_STEP_MB) * LIMIT_STEP_MB
  return Math.min(LIMIT_MAX_MB, Math.max(LIMIT_MIN_MB, stepped))
}

export function loadOfflineSettings(): OfflineSettings {
  let raw: unknown
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    raw = null
  }
  const d = DEFAULT_OFFLINE_SETTINGS
  if (!raw || typeof raw !== 'object') return { ...d }
  const r = raw as Record<string, unknown>
  const pick = <T extends string>(v: unknown, allowed: readonly string[], fallback: T) =>
    typeof v === 'string' && allowed.includes(v) ? (v as T) : fallback
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : d.enabled,
    download: pick(r.download, TRANSFERS, d.download),
    upload: pick(r.upload, TRANSFERS, d.upload),
    images: pick(r.images, IMAGE_MODES, d.images),
    limitMb: typeof r.limitMb === 'number' ? clampLimit(r.limitMb) : d.limitMb,
  }
}

export function saveOfflineSettings(settings: OfflineSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...settings, limitMb: clampLimit(settings.limitMb) }))
  } catch {
    // Quota or a blocked storage: the choice still holds for this visit.
  }
}
