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

  if (hint === 'denied')
    return (
      <p className="mb-3 text-xs text-muted-foreground">
        Benachrichtigungen sind aus – Timer klingeln nur, solange Foodly offen ist. Du kannst sie in den
        Systemeinstellungen erlauben.
      </p>
    )
  if (hint === 'inexact')
    return (
      <div className="mb-3 flex flex-col items-start gap-2">
        <p className="text-xs text-muted-foreground">Timer können sich im Hintergrund um einige Minuten verspäten.</p>
        <Button
          variant="outline"
          size="sm"
          className="touch:h-10"
          onClick={() => void allowExactNotifications().then(check)}
        >
          Genaue Wecker erlauben
        </Button>
      </div>
    )
  return null
}
