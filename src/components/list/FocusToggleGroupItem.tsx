import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { ToggleGroupItem, cn } from '@postxl/ui-components'

// postxl ships focus-visible:ring-1; 3 px like Button/RadioGroup (#95). Its twMerge drops the ring-1 because our
// className comes last. forwardRef so TooltipTrigger asChild can still reach the item.
export const FocusToggleGroupItem = forwardRef<
  ElementRef<typeof ToggleGroupItem>,
  ComponentPropsWithoutRef<typeof ToggleGroupItem>
>(({ className, ...props }, ref) => (
  <ToggleGroupItem ref={ref} className={cn('focus-visible:ring-[3px]', className)} {...props} />
))
FocusToggleGroupItem.displayName = 'FocusToggleGroupItem'
