import { useSyncExternalStore } from 'react'

// The redesign's one layout breakpoint: sidebar from here up, tab bar below (docs/design/redesign §1.6).
// Deliberately not postxl's useIsMobile (768 px), which only picks containers like the timer panel's.
// CSS counterpart: the `phone:` variant in styles.css; change both together (phoneVariant.test.ts).
export const SHELL_DESKTOP_QUERY = '(min-width: 761px)'

// Below it the sidebar starts collapsed until the user toggles it (#222); no CSS counterpart.
export const SIDEBAR_WIDE_QUERY = '(min-width: 1024px)'

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

let wideQuery: MediaQueryList | null = null
const queryWide = () => (wideQuery ??= window.matchMedia(SIDEBAR_WIDE_QUERY))

function subscribeWide(onChange: () => void) {
  const mql = queryWide()
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useIsWideDesktop(): boolean {
  return useSyncExternalStore(subscribeWide, () => queryWide().matches)
}
