import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger, Sheet, SheetTrigger } from '@postxl/ui-components'
import { BottomSheet, type BottomSheetProps } from './BottomSheet'
import { useIsDesktop } from '../hooks/useIsDesktop'

export type PanelVariant = 'popover' | 'sheet'

type ResponsivePanelProps = {
  // Rendered via asChild, so it must forward its ref: Radix anchors the popover and returns focus through it.
  trigger: ReactElement
  children: ReactNode | ((variant: PanelVariant) => ReactNode)
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Left out, the Radix defaults apply: a non-modal popover, a modal sheet.
  modal?: boolean
  onInteractOutside?: (e: Event) => void
  onCloseAutoFocus?: (e: Event) => void
  popover: Pick<ComponentProps<typeof PopoverContent>, 'align' | 'className' | 'aria-label'>
  sheet: Pick<BottomSheetProps, 'title' | 'description' | 'scroll' | 'className' | '__e2e_test_id__'>
}

// The one desktop-popover / phone-sheet switch (docs/design.md §7), at the shell breakpoint (761 px).
// It holds no open state: uncontrolled, each Radix root keeps its own, so the panel closes when the
// viewport crosses the breakpoint; pass `open` to keep it open across (the timer panel).
export function ResponsivePanel({
  trigger,
  children,
  open,
  onOpenChange,
  modal,
  onInteractOutside,
  onCloseAutoFocus,
  popover,
  sheet,
}: ResponsivePanelProps) {
  const isDesktop = useIsDesktop()
  const variant: PanelVariant = isDesktop ? 'popover' : 'sheet'
  const content = typeof children === 'function' ? children(variant) : children
  const handlers = { onInteractOutside, onCloseAutoFocus }

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange} modal={modal}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent {...popover} {...handlers}>
          {content}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={modal}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <BottomSheet {...sheet} {...handlers}>
        {content}
      </BottomSheet>
    </Sheet>
  )
}
