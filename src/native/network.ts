// Connection type for the offline sync's "Nur WLAN" settings. Built on navigator.connection only, without a
// Capacitor plugin: iOS and desktop browsers don't report a type, and unknown counts as mobile (the safe side).
export type ConnectionType = 'wifi' | 'mobile'

type NetworkInformation = { type?: string }

export function connectionType(): ConnectionType {
  const type = (navigator as Navigator & { connection?: NetworkInformation }).connection?.type
  return type === 'wifi' || type === 'ethernet' ? 'wifi' : 'mobile'
}
