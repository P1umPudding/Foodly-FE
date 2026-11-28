import { useState } from 'react'
import { loadOfflineSettings, saveOfflineSettings } from '../api/offline'
import type { OfflineSettings } from '../api/offline'

export function useOfflineSettings() {
  const [settings, setSettings] = useState(loadOfflineSettings)
  const update = (patch: Partial<OfflineSettings>) => {
    const next = { ...settings, ...patch }
    saveOfflineSettings(next)
    setSettings(next)
  }
  return [settings, update] as const
}
