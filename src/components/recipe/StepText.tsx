// A recipe step: tag tokens via TagText, plus time spans as chips that start a named timer.
import { Fragment, useMemo } from 'react'
import { Timer as TimerIcon } from 'lucide-react'
import { Button, toast } from '@postxl/ui-components'
import { TagText } from '../TagText'
import { parseDurations } from '../../timers/parseDurations'
import type { DurationMatch } from '../../timers/parseDurations'
import { useTimers } from '../../timers/TimerProvider'
import { useTimerPanel } from '../../timers/TimerPanelContext'

export function StepText({ value, timerLabel }: { value: string; timerLabel: string }) {
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
          {typeof p === 'string' ? <TagText value={p} /> : <TimerChip match={p} timerLabel={timerLabel} />}
        </Fragment>
      ))}
    </>
  )
}

// Only the chip touches the timers, so a step without a time span renders without a TimerProvider.
function TimerChip({ match, timerLabel }: { match: DurationMatch; timerLabel: string }) {
  const { timers, add } = useTimers()
  const panel = useTimerPanel()

  const onClick = () => {
    // The label names the step, so two equal spans in one step count as the same timer.
    const running = timers.some(
      (t) =>
        t.label === timerLabel &&
        t.durationMs === match.durationMs &&
        (t.status === 'running' || t.status === 'paused'),
    )
    if (running) {
      panel?.setOpen(true)
      return
    }
    add({ label: timerLabel, durationMs: match.durationMs })
    toast(`Timer gestartet: ${timerLabel}`)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={onClick}
      aria-label={`Timer starten: ${match.label}`}
      className="mx-0.5 h-auto gap-1 rounded-[4px] px-1.5 py-0 align-baseline text-[length:inherit] leading-[inherit] font-normal shadow-none"
    >
      <TimerIcon className="size-[1em]" />
      {match.label}
    </Button>
  )
}
