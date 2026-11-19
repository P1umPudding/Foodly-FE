// How far the on-screen keyboard (or any browser chrome) covers the bottom of the layout viewport, as `--vv-inset`
// on the element the returned ref is attached to (#220). iOS Safari overlays the keyboard instead of resizing the
// page, so a sheet fixed to the bottom would slide under it; the sheet reads the variable to lift its footer.
// Setting a custom property from code is the sanctioned inline exception (CLAUDE.md): the value is continuous and
// changes while the keyboard animates, so no Tailwind class can carry it.
import { useCallback, useRef } from 'react'

export const VV_INSET_VAR = '--vv-inset'

export function visualViewportInset(): number {
  const vv = window.visualViewport
  // Pinch-zoom shrinks the visual viewport too; that isn't a keyboard, so it mustn't lift anything.
  if (!vv || vv.scale !== 1) return 0
  const layoutHeight = document.documentElement.clientHeight
  return Math.max(0, Math.round(layoutHeight - vv.height - vv.offsetTop))
}

export function useVisualViewportInset<T extends HTMLElement>() {
  const detach = useRef<(() => void) | null>(null)
  // Stable, so a re-render (e.g. typing in the sheet) doesn't detach and re-attach the listeners.
  return useCallback((el: T | null) => {
    detach.current?.()
    detach.current = null
    const vv = window.visualViewport
    if (!el || !vv) return
    const update = () => el.style.setProperty(VV_INSET_VAR, `${visualViewportInset()}px`)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    detach.current = () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
}
