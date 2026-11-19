import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { X } from 'lucide-react'
import { SheetClose, SheetContent, SheetDescription, SheetTitle, cn } from '@postxl/ui-components'
import { useVisualViewportInset } from '../hooks/useVisualViewportInset'
import { PANEL_TITLE, PanelCloseButton, PanelHead } from './PanelHead'

export type BottomSheetProps = Omit<ComponentPropsWithoutRef<typeof SheetContent>, 'side' | 'title'> & {
  title: ReactNode
  description: string
  // Off: the caller lays out its own scroll region (e.g. a fixed part above a scrolling one).
  scroll?: boolean
}

// Phone sheet shared by every bottom sheet (docs/design.md §7): grip, then title left and "Schließen"
// (30 px, 40 px on touch) in one row.
// Goes inside the caller's <Sheet>, so the caller keeps the root, the trigger and `modal`.
export function BottomSheet({ title, description, scroll = true, className, children, ...props }: BottomSheetProps) {
  const keyboardInsetRef = useVisualViewportInset<HTMLDivElement>()
  return (
    <SheetContent
      side="bottom"
      {...props}
      ref={keyboardInsetRef}
      // The lib's ✕ (16 px, "Close") can't be configured; it is always the first child, so hide it and
      // render our own. It keeps its data-test-id ("<id>-close") in the DOM, hidden. pt-0: the grip sits 8 px
      // below the edge as in the mockup, not below the lib's p-6.
      // --vv-inset: the part the on-screen keyboard covers (#220). The sheet sits on top of it, so the footer stays
      // visible where neither fixed bottom-0 nor dvh notice the keyboard. Height: 80 % as usual, but never more than
      // the visible area above the keyboard, --vv-height (minus 2 rem, so the head isn't flush with the top). The home indicator lies
      // under the keyboard then, so its padding gives way. The var() fallbacks matter: unset, `bottom` would turn
      // invalid and fall back to auto.
      className={cn(
        'bottom-[var(--vv-inset,0px)] flex max-h-[min(80dvh,calc(var(--vv-height,100dvh)_-_2rem))] flex-col gap-0 rounded-t-lg px-0 pt-0 pb-[max(0px,env(safe-area-inset-bottom)_-_var(--vv-inset,0px))] [&>button:first-child]:hidden',
        className,
      )}
    >
      <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-sm bg-border-strong" />
      <PanelHead
        title={<SheetTitle className={PANEL_TITLE}>{title}</SheetTitle>}
        close={
          // Button wraps SheetClose, not the other way round: the postxl Button doesn't forwardRef.
          <PanelCloseButton asChild>
            <SheetClose>
              <X />
            </SheetClose>
          </PanelCloseButton>
        }
      />
      <SheetDescription className="sr-only">{description}</SheetDescription>
      {scroll ? <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1.5 pb-4">{children}</div> : children}
    </SheetContent>
  )
}
