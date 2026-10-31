import { useEffect, useRef, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@postxl/ui-components'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useTimers } from './TimerProvider'
import { useTimerPanel } from './TimerPanelContext'
import { TimerToggle } from './TimerToggle'
import { TimerRow } from './TimerRow'
import { TimerForm } from './TimerForm'

// Shell-header widget: the trigger plus a Popover (desktop) or bottom Sheet (phone). The open
// state comes from TimerPanelProvider so a time chip in the page can open the panel too; the
// local state only covers a panel rendered without the shell.
export function TimerPanel() {
  const shared = useTimerPanel()
  const [localOpen, setLocalOpen] = useState(false)
  const open = shared?.open ?? localOpen
  const setOpen = (next: boolean) => (shared ? shared.setOpen(next) : setLocalOpen(next))
  const isDesktop = useIsDesktop()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const { timers } = useTimers()

  // Radix would return focus to the trigger's span wrapper (not focusable) or, for the Sheet without a
  // trigger, to the body. Send it back to the chip that opened the panel, else to the header button —
  // unless the panel closed because the user clicked elsewhere: that click owns the focus now.
  const closedByOutsideClick = useRef(false)
  const onInteractOutside = (e: Event) => {
    keepOpenForToast(e)
    // A press on the header button is not "outside": the button toggles the panel itself.
    if (triggerRef.current?.contains(outsideTarget(e))) e.preventDefault()
    if (!e.defaultPrevented) closedByOutsideClick.current = true
  }
  // Reopened during the closing animation, Radix never fires onCloseAutoFocus, so the flag would linger.
  useEffect(() => {
    if (open) closedByOutsideClick.current = false
  }, [open])
  const restoreFocus = (e: Event) => {
    e.preventDefault()
    const returnTo = shared?.takeReturnFocus()
    if (closedByOutsideClick.current) {
      closedByOutsideClick.current = false
      return
    }
    ;(returnTo ?? triggerRef.current?.querySelector('button'))?.focus()
  }

  // Named timers first (the ephemeral unnamed ones sink below); within each
  // group, expired/alarming first, then by remaining time ascending.
  const ordered = [...timers].sort((a, b) => {
    const aNamed = a.label.trim() !== ''
    const bNamed = b.label.trim() !== ''
    if (aNamed !== bNamed) return aNamed ? -1 : 1
    if ((a.status === 'expired') !== (b.status === 'expired')) return a.status === 'expired' ? -1 : 1
    return a.remainingMs - b.remainingMs
  })

  // Creation menu is stationary at the top; only the timer list below it scrolls,
  // so a long list never pushes the form down. The list region takes the leftover
  // height (flex-1 + min-h-0) and scrolls within it.
  const body = (
    <>
      <div className="px-4 pb-4">
        <TimerForm />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {ordered.length === 0 ? (
          <p className="text-muted-foreground">Kein Timer läuft.</p>
        ) : (
          <div className="space-y-2">
            {ordered.map((t) => (
              <TimerRow key={t.id} timer={t} />
            ))}
          </div>
        )}
      </div>
    </>
  )

  // Both containers are non-modal so a timer-expired toast stays clickable while the panel is
  // open (a modal dialog makes everything outside it inert).
  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <TimerToggle ref={triggerRef} />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          onInteractOutside={onInteractOutside}
          onCloseAutoFocus={restoreFocus}
          aria-label="Timer"
          className="flex max-h-[min(36rem,80vh)] w-80 flex-col px-0 pb-0"
        >
          <div className="px-4 pb-3 font-semibold">Timer</div>
          {body}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      <TimerToggle ref={triggerRef} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)} />
      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent
          side="bottom"
          __e2e_test_id__="timer-sheet"
          onInteractOutside={onInteractOutside}
          onCloseAutoFocus={restoreFocus}
          className="flex max-h-[80vh] flex-col gap-0 rounded-t-lg px-0 pb-[env(safe-area-inset-bottom)]"
        >
          <div aria-hidden className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetHeader className="px-4 pb-3">
            <SheetTitle>Timer</SheetTitle>
            <SheetDescription className="sr-only">Küchen-Timer verwalten</SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    </>
  )
}

// Clicking a toast's Stopp action lands "outside" the panel; without this it
// would be treated as a click-away and close the panel. Keep it open so the
// action fires against a still-mounted timer row.
function keepOpenForToast(e: Event): void {
  const target = outsideTarget(e)
  if (target instanceof Element && target.closest('[data-sonner-toaster]')) e.preventDefault()
}

function outsideTarget(e: Event): Node | null {
  const target = (e as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent?.target
  return target instanceof Node ? target : null
}
