import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_OFFLINE_SETTINGS,
  LIMIT_MAX_MB,
  LIMIT_MIN_MB,
  loadOfflineSettings,
  saveOfflineSettings,
} from './settings'

const KEY = 'foodly.offline.settings'

describe('offline settings', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to off, Wi-Fi only and a 1 GB limit', () => {
    expect(loadOfflineSettings()).toEqual(DEFAULT_OFFLINE_SETTINGS)
    expect(DEFAULT_OFFLINE_SETTINGS).toMatchObject({ enabled: false, images: 'wifi', limitMb: 1000 })
  })

  it('survives a reload', () => {
    const chosen = { enabled: true, download: 'mobile', upload: 'wifi', images: 'always', limitMb: 2500 } as const
    saveOfflineSettings(chosen)
    // A reload only keeps localStorage; a fresh load reads it back.
    expect(loadOfflineSettings()).toEqual(chosen)
  })

  it('keeps the limit between 200 MB and 5 GB', () => {
    expect([LIMIT_MIN_MB, LIMIT_MAX_MB]).toEqual([200, 5000])
    localStorage.setItem(KEY, JSON.stringify({ limitMb: 50 }))
    expect(loadOfflineSettings().limitMb).toBe(200)
    localStorage.setItem(KEY, JSON.stringify({ limitMb: 9000 }))
    expect(loadOfflineSettings().limitMb).toBe(5000)
    saveOfflineSettings({ ...DEFAULT_OFFLINE_SETTINGS, limitMb: 1 })
    expect(JSON.parse(localStorage.getItem(KEY)!).limitMb).toBe(200)
  })

  it('falls back field by field on broken values', () => {
    localStorage.setItem(KEY, JSON.stringify({ enabled: 'yes', download: 'lte', images: 'always' }))
    expect(loadOfflineSettings()).toEqual({ ...DEFAULT_OFFLINE_SETTINGS, images: 'always' })
    localStorage.setItem(KEY, '{not json')
    expect(loadOfflineSettings()).toEqual(DEFAULT_OFFLINE_SETTINGS)
  })
})
