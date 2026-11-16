import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { X } from 'lucide-react'
import { SheetClose, SheetContent, SheetDescription, SheetTitle, cn } from '@postxl/ui-components'
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
  return (
    <SheetContent
      side="bottom"
      {...props}
      // The lib's ✕ (16 px, "Close") can't be configured; it is always the first child, so hide it and
      // render our own. It keeps its data-test-id ("<id>-close") in the DOM, hidden. pt-0: the grip sits 8 px
      // below the edge as in the mockup, not below the lib's p-6.
      className={cn(
        'flex max-h-[80vh] flex-col gap-0 rounded-t-lg px-0 pt-0 pb-[env(safe-area-inset-bottom)] [&>button:first-child]:hidden',
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
