import { useSyncExternalStore } from 'react'

// The redesign's one layout breakpoint: sidebar from here up, tab bar below (docs/design/redesign §1.6).
// Deliberately not postxl's useIsMobile (768 px), which only picks containers like the timer panel's.
// CSS counterpart: the `phone:` variant in styles.css; change both together (phoneVariant.test.ts).
export const SHELL_DESKTOP_QUERY = '(min-width: 761px)'

let desktopQuery: MediaQueryList | null = null
const query = () => (desktopQuery ??= window.matchMedia(SHELL_DESKTOP_QUERY))

function subscribe(onChange: () => void) {
  const mql = query()
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => query().matches)
}
