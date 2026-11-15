import { flushSync } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider'
import { Segment } from './list/Segment'
import type { ColorMode } from '../theme/ThemeProvider'

// The colour-mode reveal: a circle grows from the click point (View Transitions API).
function useThemeSwitch() {
  const { colorMode, resolvedColorMode, setColorMode } = useTheme()

  const select = async (e: React.MouseEvent<HTMLElement>, next: ColorMode) => {
    const nextResolved =
      next === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next

    // Skip the reveal when there's no visual change or no View Transitions API.
    if (nextResolved === resolvedColorMode || !document.startViewTransition) {
      setColorMode(next)
      return
    }

    // Keyboard selection dispatches a click at (0,0); anchor at viewport center.
    const keyboard = e.clientX === 0 && e.clientY === 0 && e.detail === 0
    const x = keyboard ? window.innerWidth / 2 : e.clientX
    const y = keyboard ? window.innerHeight / 2 : e.clientY
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    const isReverse = resolvedColorMode === 'dark'
    const root = document.documentElement
    root.dataset.themeTransition = isReverse ? 'reverse' : 'forward'
    root.dataset.themeAnim = '1'

    const transition = document.startViewTransition(() => {
      flushSync(() => setColorMode(next))
    })

    try {
      await transition.ready
      const keyframes = isReverse
        ? { clipPath: [`circle(${endRadius}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`] }
        : { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] }
      root.animate(keyframes, {
        duration: isReverse ? 400 : 500,
        easing: isReverse ? 'cubic-bezier(0.3, 0, 0.1, 1)' : 'cubic-bezier(0.2, 0, 0.9, 1)',
        pseudoElement: isReverse ? '::view-transition-old(root)' : '::view-transition-new(root)',
        fill: 'forwards',
      })
      await transition.finished
    } catch {
      // A skipped/interrupted view transition rejects; the theme was already set.
    } finally {
      if (root.dataset.themeTransition === (isReverse ? 'reverse' : 'forward')) {
        delete root.dataset.themeTransition
      }
      delete root.dataset.themeAnim
    }
  }

  return { colorMode, select }
}

// Mockup: only Hell and Dunkel carry an icon.
const SEGMENT_OPTIONS = [
  { value: 'light' as const, label: 'Hell', Icon: Sun },
  { value: 'dark' as const, label: 'Dunkel', Icon: Moon },
  { value: 'system' as const, label: 'System' },
]

// Theme choice on the profile page (mockup „Design“ segment).
export function ThemeSegment({ labelledBy }: { labelledBy: string }) {
  const { colorMode, select } = useThemeSwitch()
  return (
    <Segment<ColorMode>
      value={colorMode}
      // The switch happens in onItemClick: the reveal starts at the click point, which onChange doesn't carry.
      onChange={() => {}}
      onItemClick={(mode, e) => void select(e, mode)}
      options={SEGMENT_OPTIONS}
      withLabels
      itemClassName="h-8 gap-1.5"
      aria-labelledby={labelledBy}
    />
  )
}
