import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, cn } from '@postxl/ui-components'

export type BottomSheetProps = Omit<ComponentPropsWithoutRef<typeof SheetContent>, 'side' | 'title'> & {
  title: ReactNode
  description: string
  // Off: the caller lays out its own scroll region (e.g. a fixed part above a scrolling one).
  scroll?: boolean
}

// Phone sheet shared by every bottom sheet (docs/design.md §7): grip, title, 40 px "Schließen".
// Goes inside the caller's <Sheet>, so the caller keeps the root, the trigger and `modal`.
export function BottomSheet({ title, description, scroll = true, className, children, ...props }: BottomSheetProps) {
  return (
    <SheetContent
      side="bottom"
      {...props}
      // The lib's ✕ (16 px, "Close") can't be configured; it is always the first child, so hide it and
      // render our own. It keeps its data-test-id ("<id>-close") in the DOM, hidden.
      className={cn(
        'flex max-h-[80vh] flex-col gap-0 rounded-t-lg px-0 pb-[env(safe-area-inset-bottom)] [&>button:first-child]:hidden',
        className,
      )}
    >
      {/* Button wraps SheetClose, not the other way round: the postxl Button doesn't forwardRef. */}
      <Button asChild variant="ghost" size="icon" className="absolute top-1 right-1 size-10" aria-label="Schließen">
        <SheetClose>
          <X />
        </SheetClose>
      </Button>
      <div aria-hidden className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
      <SheetHeader className="px-4 pb-3">
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription className="sr-only">{description}</SheetDescription>
      </SheetHeader>
      {scroll ? <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div> : children}
    </SheetContent>
  )
}
