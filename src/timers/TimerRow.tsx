import { Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import type { Timer } from './TimerProvider'
import { useTimers } from './TimerProvider'
import { formatRemaining } from './format'

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      {/* span wrapper: postxl Button isn't forwardRef, so the tooltip can only
          anchor to a host element — without it the tooltip never shows. */}
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label={label}>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function TimerRow({ timer }: { timer: Timer }) {
  const { pause, resume, restart, remove, stopAlarm, alarmingIds } = useTimers()
  const alarming = alarmingIds.has(timer.id)
  // Unnamed timers are ephemeral (not saved, vanish when stopped) — render them a
  // touch paler so they read as the throwaway ones.
  const named = timer.label.trim() !== ''

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border px-3 py-2',
        // Static strong highlight is the reduced-motion fallback; the blink is
        // layered on only when motion is allowed.
        alarming && 'border-destructive bg-destructive/10 motion-safe:animate-pulse',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className={cn('truncate font-medium', named ? 'text-foreground' : 'text-muted-foreground')}>
          {timer.label || 'Timer'}
        </div>
        <div
          className={cn(
            'font-display text-xl tabular-nums',
            timer.status === 'expired' ? 'text-destructive' : named ? 'text-foreground' : 'text-foreground/70',
          )}
        >
          {formatRemaining(timer.remainingMs)}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {alarming ? (
          <IconAction label="Stopp" onClick={() => stopAlarm(timer.id)}>
            <Square className="size-4" />
          </IconAction>
        ) : timer.status === 'paused' ? (
          <IconAction label="Fortsetzen" onClick={() => resume(timer.id)}>
            <Play className="size-4" />
          </IconAction>
        ) : timer.status === 'running' ? (
          <IconAction label="Pause" onClick={() => pause(timer.id)}>
            <Pause className="size-4" />
          </IconAction>
        ) : null}

        <IconAction label="Neustart" onClick={() => restart(timer.id)}>
          <RotateCcw className="size-4" />
        </IconAction>
        <IconAction label="Löschen" onClick={() => remove(timer.id)}>
          <Trash2 className="size-4" />
        </IconAction>
      </div>
    </div>
  )
}
