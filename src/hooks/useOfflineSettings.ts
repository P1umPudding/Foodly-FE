import { useState } from 'react'
import { loadOfflineSettings, saveOfflineSettings } from '../api/offline'
import type { OfflineSettings } from '../api/offline'

export function useOfflineSettings() {
  const [settings, setSettings] = useState(loadOfflineSettings)
  // From the previous state, so two updates before a re-render both land.
  const update = (patch: Partial<OfflineSettings>) =>
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveOfflineSettings(next)
      return next
    })
  return [settings, update] as const
}
