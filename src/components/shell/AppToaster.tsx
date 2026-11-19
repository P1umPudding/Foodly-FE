// The one Toaster of the signed-in app. Toasts sit above whatever covers the bottom edge: the tab bar on the phone,
// cook mode's footer on every width. sonner applies mobileOffset only up to 600 px, so the offset follows our
// breakpoint instead.
import { useLocation } from 'react-router-dom'
import { Toaster } from '@postxl/ui-components'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { isCookMode, subpageOf } from './origin'

const PHONE_TOAST_OFFSET = { bottom: 'calc(5rem + env(safe-area-inset-bottom))' }
const EDITOR_PHONE_TOAST_OFFSET = { bottom: 'calc(1rem + env(safe-area-inset-bottom))' }
const COOK_TOAST_OFFSET = { bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }

export function AppToaster() {
  const isDesktop = useIsDesktop()
  const { pathname } = useLocation()
  const offset = isCookMode(pathname)
    ? COOK_TOAST_OFFSET
    : isDesktop
      ? undefined
      : subpageOf(pathname) === 'editor'
        ? EDITOR_PHONE_TOAST_OFFSET
        : PHONE_TOAST_OFFSET
  return <Toaster offset={offset} mobileOffset={offset} />
}
