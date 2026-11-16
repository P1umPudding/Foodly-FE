// A recipe step: tag tokens via TagText, plus time spans as chips that start a named timer and open the timer panel.
import { Fragment, useMemo } from 'react'
import type { MouseEvent } from 'react'
import { Timer as TimerIcon } from 'lucide-react'
import { Button, cn } from '@postxl/ui-components'
import { TagText } from '../TagText'
import { parseDurations, shortDurationLabel } from '../../timers/parseDurations'
import type { DurationMatch } from '../../timers/parseDurations'
import { useTimers } from '../../timers/TimerProvider'
import { useTimerPanel } from '../../timers/TimerPanelContext'

// `cook`: the chip scales with the large step text of cook mode (#209) instead of its fixed 24 px.
type ChipVariant = 'inline' | 'cook'

export function StepText({
  value,
  timerLabel,
  variant = 'inline',
}: {
  value: string
  timerLabel: string
  variant?: ChipVariant
}) {
  const parts = useMemo(() => {
    const out: Array<string | DurationMatch> = []
    let last = 0
    for (const m of parseDurations(value)) {
      if (m.start > last) out.push(value.slice(last, m.start))
      out.push(m)
      last = m.end
    }
    if (last < value.length) out.push(value.slice(last))
    return out
  }, [value])

  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {typeof p === 'string' ? (
            <TagText value={p} />
          ) : (
            <TimerChip match={p} timerLabel={timerLabel} variant={variant} />
          )}
        </Fragment>
      ))}
    </>
  )
}

// Only the chip touches the timers, so a step without a time span renders without a TimerProvider.
function TimerChip({ match, timerLabel, variant }: { match: DurationMatch; timerLabel: string; variant: ChipVariant }) {
  const { timers, add } = useTimers()
  const panel = useTimerPanel()
  const short = shortDurationLabel(match.label)

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // The label names the step, so two equal spans in one step count as the same timer.
    const running = timers.some(
      (t) =>
        t.label === timerLabel &&
        t.durationMs === match.durationMs &&
        (t.status === 'running' || t.status === 'paused'),
    )
    if (!running) add({ label: timerLabel, durationMs: match.durationMs })
    panel?.setOpen(true, e.currentTarget)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={onClick}
      data-timer-chip
      // Built from the visible text, so speech input can name the chip by what it shows (WCAG 2.5.3).
      aria-label={`Timer starten: ${short}`}
      className={cn(
        'relative mx-px gap-1 rounded-sm bg-card px-2 py-0 font-semibold text-foreground shadow-none hover:bg-hover hover:text-foreground dark:border-border dark:bg-card dark:hover:bg-hover',
        // 40 px tap area on touch (design.md §7) around the 24 px chip. It reaches into the line above and below; no
        // z-index, as a negative one would put it behind the step text.
        'touch:after:absolute touch:after:inset-x-0 touch:after:-inset-y-2',
        variant === 'cook' ? 'h-[1.3em] align-[0.12em] text-[0.8em]' : 'h-6 align-[1px] text-sm',
      )}
    >
      <TimerIcon className="size-3.5" />
      {short}
    </Button>
  )
}
