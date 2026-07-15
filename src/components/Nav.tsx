import { Link } from 'react-router-dom'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/recipes/new">
                  <Plus className="h-4 w-4" />
                  {/* the label collapses on narrow screens so the header never wraps */}
                  <span className="hidden sm:inline">Neues Rezept</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Neues Rezept</TooltipContent>
          </Tooltip>
          <ConnectionDot />
          <TimerPanel />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
