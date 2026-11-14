// Loading placeholder with the mockup's shimmer (design.md §5). Replaces postxl `Skeleton`, which only pulses and
// whose `animate-pulse` tailwind-merge can't drop in favour of a custom animation.
import type { ComponentProps } from 'react'
import { cn } from '@postxl/ui-components'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-shimmer rounded-md bg-skel bg-linear-to-r from-skel from-25% via-muted via-50% to-skel to-75% bg-size-[200%_100%] motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  )
}
