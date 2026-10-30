import { useSyncExternalStore } from 'react'

// The redesign's one layout breakpoint: sidebar from here up, tab bar below (docs/design/redesign §1.6).
// Deliberately not postxl's useIsMobile (768 px), which only picks containers like the timer panel's.
export const SHELL_DESKTOP_QUERY = '(min-width: 761px)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(SHELL_DESKTOP_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(SHELL_DESKTOP_QUERY).matches)
}
