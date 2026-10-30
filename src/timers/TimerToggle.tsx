import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import { AlarmClock, Timer as TimerIcon } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { useTimers } from './TimerProvider'
import { formatRemaining } from './format'

// Shell-header trigger: opens the timer panel, shows the next-to-expire countdown when a
// timer runs, and turns alarm-coloured while any timer is alarming. The ref and trigger props
// (from PopoverTrigger asChild) land on the span wrapper: postxl Button isn't forwardRef, so
// neither the tooltip nor the popover could anchor to it otherwise. The aria state belongs to the
// focusable button, so it is moved there.
export const TimerToggle = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(function TimerToggle(
  { className, 'aria-expanded': expanded, 'aria-haspopup': hasPopup, 'aria-controls': controls, ...props },
  ref,
) {
  const { nextRemainingMs, alarmingIds } = useTimers()
  const alarming = alarmingIds.size > 0
  const Icon = alarming ? AlarmClock : TimerIcon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span ref={ref} {...props} className={cn('inline-flex', className)}>
          <Button
            type="button"
            variant="ghost"
            size={nextRemainingMs !== null ? 'sm' : 'icon'}
            aria-label="Timer"
            aria-expanded={expanded}
            aria-haspopup={hasPopup}
            aria-controls={controls}
            className={cn(
              'gap-1.5 rounded-md focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
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
})
