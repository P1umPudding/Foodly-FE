import { Pause, Play, RotateCcw, Square, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { TriggerButton } from '../components/TriggerButton'
import type { Timer } from './TimerProvider'
import { useTimers } from './TimerProvider'
import { formatRemaining } from './format'

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TriggerButton
          variant="ghost"
          size="iconSm"
          onClick={onClick}
          aria-label={label}
          className="phone:size-10 touch:size-10"
        >
          {children}
        </TriggerButton>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

// Share of the time already gone, so the bar fills up towards the alarm.
function elapsedShare({ durationMs, remainingMs }: Timer): number {
  if (durationMs <= 0) return 0
  return Math.min(1, Math.max(0, (durationMs - remainingMs) / durationMs))
}

export function TimerRow({ timer }: { timer: Timer }) {
  const { pause, resume, restart, remove, stopAlarm, alarmingIds } = useTimers()
  const alarming = alarmingIds.has(timer.id)
  const paused = timer.status === 'paused'
  // Unnamed timers are ephemeral (not saved, vanish when stopped) — render them a
  // touch paler so they read as the throwaway ones.
  const named = timer.label.trim() !== ''
  const label = timer.label || 'Timer'

  return (
    // Named group: several rows repeat the same action names ("Entfernen", "Pause").
    <div role="group" aria-label={label} className="border-b border-border py-1">
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-md py-1.5',
          // Static strong highlight is the reduced-motion fallback; the blink is
          // layered on only when motion is allowed.
          alarming && '-mx-2 bg-destructive/10 px-2 motion-safe:animate-pulse',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className={cn('truncate font-medium', named ? 'text-foreground' : 'text-muted-foreground')}>{label}</div>
          <progress
            max={1}
            value={elapsedShare(timer)}
            aria-label={`Fortschritt ${label}`}
            className={cn(
              'mt-1.5 block h-[3px] w-full appearance-none overflow-hidden rounded-full bg-border',
              '[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:rounded-full',
              paused
                ? '[&::-moz-progress-bar]:bg-subtle-foreground [&::-webkit-progress-value]:bg-subtle-foreground'
                : '[&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-value]:bg-foreground',
            )}
          />
        </div>

        {/* 20 px/600 from the mockup: the compact text scale has no 20 px step. */}
        <div
          className={cn(
            'mr-1.5 ml-2.5 shrink-0 text-[20px] font-semibold tabular-nums',
            timer.status === 'expired'
              ? 'text-destructive'
              : paused
                ? // Mockup has --fg-subtle here; subtle-foreground misses AA for 20 px/600 (docs/design.md §2).
                  'text-muted-foreground'
                : named
                  ? 'text-foreground'
                  : 'text-foreground/70',
          )}
        >
          {formatRemaining(timer.remainingMs)}
        </div>

        {alarming ? (
          <IconAction label="Stopp" onClick={() => stopAlarm(timer.id)}>
            <Square className="size-4" />
          </IconAction>
        ) : paused ? (
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
        <IconAction label="Entfernen" onClick={() => remove(timer.id)}>
          <X className="size-4" />
        </IconAction>
      </div>
    </div>
  )
}
