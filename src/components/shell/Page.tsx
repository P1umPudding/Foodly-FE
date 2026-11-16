// The content frame of every page in the shell (mockup `.page`): centred, max. 1080 px including its side padding,
// `wide` for the recipe list (1280 px). Pages add their own bottom padding (the phone "+" button needs room, #74).
import type { ReactNode } from 'react'
import { cn } from '@postxl/ui-components'

export function Page({
  wide = false,
  className,
  children,
  ...rest
}: {
  wide?: boolean
  className?: string
  children: ReactNode
  'data-testid'?: string
}) {
  return (
    <div
      {...rest}
      className={cn(
        'mx-auto w-full px-8 pt-6 phone:px-4 phone:pt-3',
        wide ? 'max-w-[1280px]' : 'max-w-[1080px]',
        className,
      )}
    >
      {children}
    </div>
  )
}
