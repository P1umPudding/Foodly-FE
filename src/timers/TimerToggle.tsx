import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { AlarmClock, Timer as TimerIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { TriggerButton } from '../components/TriggerButton'
import { useTimers } from './TimerProvider'
import { formatRemaining } from './format'

// Shell-header trigger: opens the timer panel, shows the next-to-expire countdown in a pill while a
// timer runs, and turns alarm-coloured while any timer is alarming.
export const TimerToggle = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>(function TimerToggle(
  { className, ...props },
  ref,
) {
  const { nextRemainingMs, alarmingIds } = useTimers()
  const alarming = alarmingIds.size > 0
  const Icon = alarming ? AlarmClock : TimerIcon
  const running = nextRemainingMs !== null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TriggerButton
          ref={ref}
          {...props}
          variant="ghost"
          size={running ? 'sm' : 'icon'}
          aria-label="Timer"
          className={cn(
            'gap-1.5 rounded-md',
            // 40 px tap target on phones, same height with and without the countdown so the header doesn't jump.
            running ? 'phone:h-10' : 'phone:size-10',
            running && 'text-sm font-semibold',
            alarming
              ? 'text-destructive hover:text-destructive'
              : running
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            className,
          )}
        >
          <Icon className="size-4" />
          {running && (
            <span className="rounded-sm bg-muted px-1.5 py-px tabular-nums phone:px-[5px]">
              {formatRemaining(nextRemainingMs)}
            </span>
          )}
        </TriggerButton>
      </TooltipTrigger>
      <TooltipContent>Timer</TooltipContent>
    </Tooltip>
  )
})
