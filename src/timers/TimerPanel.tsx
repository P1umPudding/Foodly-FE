import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  useIsMobile,
} from '@postxl/ui-components'
import { useTimers } from './TimerProvider'
import { TimerToggle } from './TimerToggle'
import { TimerRow } from './TimerRow'
import { TimerForm } from './TimerForm'

// Nav-facing widget: owns the panel open/closed state and renders the trigger
// plus a Sheet (desktop) or Drawer (mobile). Both carry a Title + Description so
// the underlying Radix dialog stays accessible and console-clean.
export function TimerPanel() {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()
  const { timers } = useTimers()

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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
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

  const trigger = <TimerToggle onClick={() => setOpen(true)} />

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen} modal={false}>
          <DrawerContent onInteractOutside={keepOpenForToast}>
            <DrawerHeader>
              <DrawerTitle>Timer</DrawerTitle>
              <DrawerDescription className="sr-only">Küchen-Timer verwalten</DrawerDescription>
            </DrawerHeader>
            <div className="flex max-h-[70vh] min-h-0 flex-col">{body}</div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <>
      {trigger}
      {/* Non-modal so a timer-expired toast stays clickable while the panel is
          open (a modal dialog makes everything outside it inert). */}
      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent
          side="right"
          onInteractOutside={keepOpenForToast}
          className="flex w-full flex-col gap-0 sm:max-w-sm"
        >
          <SheetHeader>
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
  const target = (e as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent?.target
  if (target instanceof Element && target.closest('[data-sonner-toaster]')) e.preventDefault()
}
