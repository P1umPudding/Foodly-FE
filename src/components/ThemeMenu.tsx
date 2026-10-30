import { flushSync } from 'react-dom'
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@postxl/ui-components'
import { useTheme } from '../theme/ThemeProvider'
import type { ColorMode } from '../theme/ThemeProvider'

const ICON = 'h-4 w-4'

function SunIcon() {
  return (
    <svg
      className={ICON}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg
      className={ICON}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
function MonitorIcon() {
  return (
    <svg
      className={ICON}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}
type Option = { mode: ColorMode; label: string; icon: () => JSX.Element }
const OPTIONS: Option[] = [
  { mode: 'light', label: 'Hell', icon: SunIcon },
  { mode: 'dark', label: 'Dunkel', icon: MoonIcon },
  { mode: 'system', label: 'System', icon: MonitorIcon },
]

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

  return { colorMode, resolvedColorMode, select }
}

// Theme choice as a submenu of the profile menu (the shell has no standalone theme button any more).
export function ThemeSubmenu() {
  const { colorMode, resolvedColorMode, select } = useThemeSwitch()

  const ActiveIcon =
    colorMode === 'system'
      ? resolvedColorMode === 'dark'
        ? MoonIcon
        : SunIcon
      : (OPTIONS.find((o) => o.mode === colorMode)?.icon ?? MonitorIcon)

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <ActiveIcon />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-40">
        <DropdownMenuRadioGroup value={colorMode}>
          {OPTIONS.map(({ mode, label, icon: Icon }) => (
            // onClick, not onValueChange: the reveal starts at the click point.
            <DropdownMenuRadioItem key={mode} value={mode} onClick={(e) => select(e, mode)} className="gap-2">
              <Icon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
