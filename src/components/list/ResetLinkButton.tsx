import type { ComponentProps } from 'react'
import { Button, cn } from '@postxl/ui-components'

// The mockup's .link-btn: a small muted text button with a hover fill ("Alle Filter zurücksetzen", the filter
// panels' „Zurücksetzen“).
export function ResetLinkButton({ className, ...props }: Omit<ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className={cn(
        'h-[26px] px-1.5 text-xs font-medium text-muted-foreground hover:bg-hover hover:text-foreground dark:hover:bg-hover',
        className,
      )}
      {...props}
    />
  )
}
