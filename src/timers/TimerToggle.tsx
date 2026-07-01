import { AlarmClock, Timer as TimerIcon } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { useTimers } from './TimerProvider'
import { formatRemaining } from './format'

// Nav trigger: opens the timer panel, shows the next-to-expire countdown when a
// timer runs, and turns alarm-coloured while any timer is alarming.
export function TimerToggle({ onClick }: { onClick: () => void }) {
  const { nextRemainingMs, alarmingIds } = useTimers()
  const alarming = alarmingIds.size > 0
  const Icon = alarming ? AlarmClock : TimerIcon

  return (
    <Tooltip>
      {/* span wrapper: postxl Button isn't forwardRef, so the tooltip can only
          anchor to a host element — without it the tooltip never shows. */}
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size={nextRemainingMs !== null ? 'sm' : 'icon'}
            onClick={onClick}
            aria-label="Timer"
            className={cn(
              'gap-1.5 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
              alarming ? 'text-destructive hover:text-destructive' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {nextRemainingMs !== null && <span className="tabular-nums">{formatRemaining(nextRemainingMs)}</span>}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Timer</TooltipContent>
    </Tooltip>
  )
}
