// The head of every bottom sheet and of popovers with a head (the mockup's `.sheet-h`): title left,
// ✕ right, one row. BottomSheet uses it for every phone sheet; a popover opts in by rendering it.
import type { ReactNode } from 'react'
import { Button, cn, type ButtonProps } from '@postxl/ui-components'

// A class string rather than a component: it has to merge into the lib's SheetTitle (which brings
// text-lg/font-semibold) via className; SheetTitle asChild would concatenate instead of merge.
// 16 px/650 is off the compact text scale on purpose (docs/design.md, Schrift).
export const PANEL_TITLE = 'min-w-0 text-left text-[16px] font-[650]'

export function PanelHead({ title, close }: { title: ReactNode; close: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-1.5">
      {title}
      {close}
    </div>
  )
}

// No tooltip: Radix focuses this button when the panel opens, which would pop one up right away.
export function PanelCloseButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      variant="ghost"
      size="iconSm"
      aria-label="Schließen"
      className={cn('shrink-0 touch:size-10', className)}
      {...props}
    />
  )
}
