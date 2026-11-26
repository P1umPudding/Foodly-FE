// Registers public/sw.js so browsers offer "Install app" (#345, docs/native.md). Web production build only: the guard
// reads import.meta.env directly so Vite folds it and drops the rest in dev and `--mode native` builds.

import { isNative } from './native/platform'

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || import.meta.env.MODE === 'native') return
  if (isNative() || !('serviceWorker' in navigator)) return
  const register = () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => console.error(error))
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
