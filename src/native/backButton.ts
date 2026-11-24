// Android back button (#325): close the top overlay first, then go back, and leave the app on a start page.
// @capacitor/app is imported dynamically and only on Android, so the web entry chunk stays free of Capacitor.
import type { NavigateFunction } from 'react-router'
import { platform } from './platform'

// Radix overlays carry data-state; the Lightbox sets it by hand. postxl's Select content is a listbox.
export const OVERLAY_SELECTOR = ['dialog', 'alertdialog', 'menu', 'listbox']
  .map((role) => `[role="${role}"][data-state="open"]`)
  .join(', ')

// Pages where back leaves the app: the start page, and the sign-in page, since every signed-in route sends a
// signed-out user there (navigate('/') would bounce right back).
const EXIT_PATHS = new Set(['/', '/login'])

export function topOverlay(root: ParentNode = document): Element | null {
  const open = root.querySelectorAll(OVERLAY_SELECTOR)
  return open.length ? open[open.length - 1] : null
}

export interface BackContext {
  canGoBack: boolean
  pathname: string
  navigate: NavigateFunction
  exitApp: () => void
}

export function handleBack({ canGoBack, pathname, navigate, exitApp }: BackContext): void {
  const overlay = topOverlay()
  if (overlay) {
    // Radix closes its own topmost layer on a document-level Escape, wherever the event starts; the DOM order only
    // tells whether something is open, and finds the Lightbox (it listens on window). The target still matters:
    // from the focused element, a sheet can let an open suggestion list take the first Escape (IngredientSheet).
    const focused = document.activeElement
    const target = focused && overlay.contains(focused) ? focused : overlay
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    return
  }
  // Register usually opens from the sign-in page, so back returns there when it can.
  if (EXIT_PATHS.has(pathname) || (pathname === '/register' && !canGoBack)) exitApp()
  else if (canGoBack) void navigate(-1)
  else void navigate('/', { replace: true })
}

export type BackHandler = (event: { canGoBack: boolean; exitApp: () => void }) => void

// Returns the cleanup; it also works when called before the plugin has loaded (unmount, StrictMode's double effect).
export function registerBackButton(onBack: BackHandler): () => void {
  if (platform() !== 'android') return () => {}
  let cancelled = false
  let remove: (() => Promise<void>) | undefined
  void import('@capacitor/app')
    .then(async ({ App }) => {
      if (cancelled) return
      const exitApp = () => void App.exitApp().catch((error: unknown) => console.error(error))
      const handle = await App.addListener('backButton', ({ canGoBack }) => onBack({ canGoBack, exitApp }))
      if (cancelled) await handle.remove()
      else remove = () => handle.remove()
    })
    .catch((error: unknown) => console.error(error))
  return () => {
    cancelled = true
    void remove?.().catch((error: unknown) => console.error(error))
  }
}
