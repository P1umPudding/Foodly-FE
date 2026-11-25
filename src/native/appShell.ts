// Splash screen and status bar for the native app (#324). The splash stays up (launchAutoHide: false) until the first
// render, or at most SPLASH_FALLBACK_MS if rendering fails; the status-bar icons follow the resolved theme.
// Plugins are imported dynamically, the Style enum included, so the web entry chunk stays free of Capacitor.
// Web: no-ops, no plugin is ever loaded. A failing plugin is logged, never thrown: it must not break the app.
import { isNative } from './platform'

const SPLASH_FALLBACK_MS = 3000

let splashPlugin: Promise<typeof import('@capacitor/splash-screen')> | null = null
const loadSplash = () => (splashPlugin ??= import('@capacitor/splash-screen'))
let statusBarPlugin: Promise<typeof import('@capacitor/status-bar')> | null = null
const loadStatusBar = () => (statusBarPlugin ??= import('@capacitor/status-bar'))

// Set on the first hide, so StrictMode's double effect hides once. The fallback timer is cleared only after hide()
// succeeded: if it fails, the fallback tries once more instead of leaving the splash over the app for good.
let hideRequested = false
let fallback: ReturnType<typeof setTimeout> | undefined

function hide(): void {
  void loadSplash()
    .then(({ SplashScreen }) => SplashScreen.hide())
    .then(() => {
      clearTimeout(fallback)
      fallback = undefined
    })
    .catch((error: unknown) => console.error(error))
}

export function startSplash(): void {
  if (!isNative() || hideRequested || fallback !== undefined) return
  fallback = setTimeout(() => {
    fallback = undefined
    hideRequested = true
    hide()
  }, SPLASH_FALLBACK_MS)
}

export function hideSplash(): void {
  if (!isNative() || hideRequested) return
  hideRequested = true
  hide()
}

// Both calls wait on the same cached import, so their setStyle calls go out in call order.
export function setStatusBarStyle(mode: 'light' | 'dark'): void {
  if (!isNative()) return
  void loadStatusBar()
    .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: mode === 'dark' ? Style.Dark : Style.Light }))
    .catch((error: unknown) => console.error(error))
}
