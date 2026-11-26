import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@postxl/ui-components'
import { isNative } from '../native/platform'
import {
  allowExactNotifications,
  notificationHint,
  onForeground,
  type NotificationHint as Hint,
} from '../native/timerNotifications'

// Native only: tells the user when timers won't ring (or ring late) in the background. Mounted with the panel
// body, so opening the panel checks; coming back from the system settings checks again.
export function NotificationHint() {
  const [hint, setHint] = useState<Hint | null>(null)
  const latest = useRef(0)
  const disposed = useRef(false)

  // The button's own re-check and the return-to-foreground one race; only the newest result counts.
  const check = useCallback(() => {
    const id = ++latest.current
    void notificationHint().then((next) => {
      if (!disposed.current && id === latest.current) setHint(next)
    })
  }, [])

  useEffect(() => {
    if (!isNative()) return
    disposed.current = false
    check()
    const stop = onForeground(check)
    return () => {
      disposed.current = true
      stop()
    }
  }, [check])

  if (!isNative()) return null
  const text =
    hint === 'denied'
      ? 'Benachrichtigungen sind aus – Timer klingeln nur, solange Foodly offen ist. Du kannst sie in den Systemeinstellungen erlauben.'
      : hint === 'inexact'
        ? 'Timer können sich im Hintergrund um einige Minuten verspäten.'
        : null
  // The text sits in a live region that is always there, so a hint that appears or changes later is announced;
  // the button stays outside it.
  return (
    <div className={text ? 'mb-3 flex flex-col items-start gap-2' : undefined}>
      <p role="status" className="text-xs text-muted-foreground">
        {text}
      </p>
      {hint === 'inexact' && (
        <Button
          variant="outline"
          size="sm"
          className="touch:h-10"
          onClick={() => void allowExactNotifications().then(check)}
        >
          Genaue Wecker erlauben
        </Button>
      )}
    </div>
  )
}
