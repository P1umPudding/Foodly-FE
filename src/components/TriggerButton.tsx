// A button that forwards its ref, for Radix triggers (Tooltip, Popover, DropdownMenu, AlertDialog … with
// asChild): they anchor and return focus through the ref, and the postxl Button doesn't forward one.
// Styled exactly like the postxl Button (minus its __e2e_test_id__ prop); `bare` drops the button styling and keeps only the focus ring.
import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { buttonVariants, cn } from '@postxl/ui-components'
import type { ButtonProps } from '@postxl/ui-components'
import { FOCUS_RING } from './focusRing'

type TriggerButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: NonNullable<ButtonProps['variant']> | 'bare'
  size?: NonNullable<ButtonProps['size']>
}

export const TriggerButton = forwardRef<HTMLButtonElement, TriggerButtonProps>(function TriggerButton(
  { variant = 'default', size = 'default', type = 'button', className, ...props },
  ref,
) {
  return (
    // eslint-disable-next-line react/forbid-elements -- the one ref-forwarding stand-in for the postxl Button (see above)
    <button
      ref={ref}
      type={type}
      data-slot="button"
      className={cn(variant === 'bare' ? FOCUS_RING : buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
})
