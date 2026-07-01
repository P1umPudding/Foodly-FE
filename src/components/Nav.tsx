import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { TimerPanel } from '../timers/TimerPanel'
import { ConnectionDot } from './ConnectionDot'

export function Nav() {
  return (
    <header className="site-header sticky top-0 z-50 border-b border-border/60 bg-background shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="font-display text-[1.35rem] text-foreground">
          Foodly
        </Link>
        <nav className="flex items-center gap-2 text-[0.95rem] sm:gap-3">
          <ConnectionDot />
          <TimerPanel />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
