// How far the on-screen keyboard (or any browser chrome) covers the bottom of the layout viewport, as `--vv-inset`
// (plus the visible height above it, `--vv-height`) on the element the returned ref is attached to (#220). iOS Safari, and Chrome on Android by default
// (interactive-widget=resizes-visual), overlay the keyboard instead of resizing the page, so a sheet fixed to the
// bottom would slide under it; the sheet reads the variable to lift itself. We don't opt into resizes-content
// instead: it would also push the tab bar and "+" button up over every focused field in the app.
// Setting a custom property from code is the sanctioned inline exception (CLAUDE.md): the value is continuous and
// changes while the keyboard animates, so no Tailwind class can carry it.
import { useCallback, useRef } from 'react'

export const VV_INSET_VAR = '--vv-inset'
// The visible height above the keyboard. Not layout height minus the inset: iOS also scrolls the visual viewport
// down to the focused field (offsetTop), and a sheet as tall as layout minus inset would lose its head above it.
export const VV_HEIGHT_VAR = '--vv-height'

// Pinch-zoom shrinks the visual viewport too; that isn't a keyboard, so it mustn't lift or shrink anything.
// Tolerance: after zooming back out, Android may report a scale like 0.99999.
function unzoomedViewport() {
  const vv = window.visualViewport
  return vv && Math.abs(vv.scale - 1) <= 0.01 ? vv : null
}

export function visualViewportInset(): number {
  const vv = unzoomedViewport()
  if (!vv) return 0
  const layoutHeight = document.documentElement.clientHeight
  return Math.max(0, Math.round(layoutHeight - vv.height - vv.offsetTop))
}

export function visualViewportHeight(): number {
  return Math.round(unzoomedViewport()?.height ?? document.documentElement.clientHeight)
}

export function useVisualViewportInset<T extends HTMLElement>() {
  const detach = useRef<(() => void) | null>(null)
  // Stable, so a re-render (e.g. typing in the sheet) doesn't detach and re-attach the listeners.
  return useCallback((el: T | null) => {
    detach.current?.()
    detach.current = null
    const vv = window.visualViewport
    if (!el || !vv) return
    const update = () => {
      el.style.setProperty(VV_INSET_VAR, `${visualViewportInset()}px`)
      el.style.setProperty(VV_HEIGHT_VAR, `${visualViewportHeight()}px`)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    detach.current = () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
}
