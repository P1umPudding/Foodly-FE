import { useRef, useState } from 'react'
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
  const setOpen = shared?.setOpen ?? setLocalOpen
  const isDesktop = useIsDesktop()
  const triggerRef = useRef<HTMLSpanElement>(null)
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
          onInteractOutside={keepOpenForToast}
          // Radix would return focus to the span wrapper, which isn't focusable; hand it to the button.
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            triggerRef.current?.querySelector('button')?.focus()
          }}
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
      <TimerToggle onClick={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent
          side="bottom"
          __e2e_test_id__="timer-sheet"
          onInteractOutside={keepOpenForToast}
          className="flex max-h-[80vh] flex-col gap-0 rounded-t-lg px-0 pb-[env(safe-area-inset-bottom)]"
        >
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
  const target = (e as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent?.target
  if (target instanceof Element && target.closest('[data-sonner-toaster]')) e.preventDefault()
}
