import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearOfflineStore, offlineGet, offlinePut, offlineUsageBytes } from './db'
import { saveOfflineSettings, loadOfflineSettings, DEFAULT_OFFLINE_SETTINGS } from './settings'

describe('offline store', () => {
  beforeEach(() => clearOfflineStore())

  it('stores entries and counts their size', async () => {
    expect(await offlineUsageBytes()).toBe(0)
    await offlinePut('recipes', '1', { id: 1, name: 'Suppe' })
    // fake-indexeddb's structured clone drops Blobs under jsdom, so the image here is a plain string.
    await offlinePut('images', 'a', 'x'.repeat(1000))
    expect(await offlineGet('recipes', '1')).toEqual({ id: 1, name: 'Suppe' })
    expect(await offlineUsageBytes()).toBeGreaterThanOrEqual(1000)
  })

  it('„Cache leeren“ empties every store but keeps the settings', async () => {
    saveOfflineSettings({ ...DEFAULT_OFFLINE_SETTINGS, enabled: true })
    await offlinePut('recipes', '1', { id: 1 })
    await offlinePut('meta', 'syncedAt', 123)
    await clearOfflineStore()
    expect(await offlineGet('recipes', '1')).toBeUndefined()
    expect(await offlineGet('meta', 'syncedAt')).toBeUndefined()
    expect(await offlineUsageBytes()).toBe(0)
    expect(loadOfflineSettings().enabled).toBe(true)
  })
})
