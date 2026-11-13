import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Play } from 'lucide-react'
import { Button, Input } from '@postxl/ui-components'
import { useTimers } from './TimerProvider'
import { formatDurationInput, parseDurationInput } from './parseDurationInput'

const QUICK_MINUTES = [5, 10, 15, 30]
const DEFAULT = formatDurationInput(5 * 60)

export function TimerForm() {
  const { add } = useTimers()
  const [label, setLabel] = useState('')
  const [duration, setDuration] = useState(DEFAULT)
  const [invalid, setInvalid] = useState(false)
  const durationRef = useRef<HTMLInputElement>(null)
  const headingId = useId()
  const errorId = useId()

  const changeDuration = (text: string) => {
    setDuration(text)
    setInvalid(false)
  }

  const start = (e: FormEvent) => {
    e.preventDefault()
    const seconds = parseDurationInput(duration)
    if (seconds === null) {
      setInvalid(true)
      durationRef.current?.focus()
      return
    }
    add({ label: label.trim(), durationMs: seconds * 1000 })
    setLabel('')
    setDuration(DEFAULT)
  }

  return (
    <form onSubmit={start} aria-labelledby={headingId} noValidate>
      <div id={headingId} className="mb-2 text-xs font-semibold text-subtle-foreground">
        Neuer Timer
      </div>
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Name (optional)"
        aria-label="Timer-Name"
        className="mb-2 touch:h-10"
      />

      <div className="mb-2 grid grid-cols-4 gap-1.5">
        {QUICK_MINUTES.map((min) => (
          <Button
            key={min}
            type="button"
            variant="outline"
            size="smLow"
            onClick={() => changeDuration(formatDurationInput(min * 60))}
            className="touch:h-10"
          >
            {min} min
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          ref={durationRef}
          value={duration}
          onChange={(e) => changeDuration(e.target.value)}
          placeholder="0:12:00"
          aria-label="Dauer"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          className="flex-1 tabular-nums touch:h-10"
        />
        <Button type="submit" className="touch:h-10">
          <Play />
          Starten
        </Button>
      </div>
      {invalid && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
          Ungültige Dauer, z. B. 12 oder 0:12:00
        </p>
      )}
    </form>
  )
}
