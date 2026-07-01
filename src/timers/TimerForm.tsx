import { useState } from 'react'
import { Button, Input, cn } from '@postxl/ui-components'
import { DurationPicker } from '../components/DurationPicker'
import type { Duration } from '../components/DurationPicker'
import { useTimers } from './TimerProvider'

const QUICK_MINUTES = [1, 3, 5, 10, 15]
const DEFAULT: Duration = { h: 0, m: 5, s: 0 }

function totalMs({ h, m, s }: Duration): number {
  return (h * 3600 + m * 60 + s) * 1000
}

export function TimerForm() {
  const { add } = useTimers()
  const [label, setLabel] = useState('')
  const [duration, setDuration] = useState<Duration>(DEFAULT)

  const ms = totalMs(duration)

  const start = () => {
    if (ms === 0) return
    add({ label: label.trim(), durationMs: ms })
    setLabel('')
    setDuration(DEFAULT)
  }

  return (
    <div className="space-y-3">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Name (optional)"
        aria-label="Timer-Name"
      />

      <div className="flex flex-wrap gap-1.5">
        {QUICK_MINUTES.map((min) => {
          const active = duration.h === 0 && duration.m === min && duration.s === 0
          return (
            <Button
              key={min}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="xs"
              onClick={() => setDuration({ h: 0, m: min, s: 0 })}
              className={cn('rounded-full', active && 'pointer-events-none')}
            >
              {min} min
            </Button>
          )
        })}
      </div>

      <DurationPicker value={duration} onChange={setDuration} />

      <Button type="button" onClick={start} disabled={ms === 0} className="w-full">
        Timer starten
      </Button>
    </div>
  )
}
