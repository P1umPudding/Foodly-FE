// Which shell runs the app. The Capacitor shell injects `window.Capacitor` before the bundle loads; reading that
// global instead of importing @capacitor/core keeps Capacitor out of the web entry chunk (ADR 0005).

export type Platform = 'web' | 'android' | 'ios'

interface CapacitorShell {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
}

function shell(): CapacitorShell | undefined {
  return (globalThis as typeof globalThis & { Capacitor?: CapacitorShell }).Capacitor
}

export function isNative(): boolean {
  return shell()?.isNativePlatform?.() === true
}

export function platform(): Platform {
  const name = shell()?.getPlatform?.()
  return name === 'android' || name === 'ios' ? name : 'web'
}
