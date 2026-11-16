import { ChefHat } from 'lucide-react'
import { cn } from '@postxl/ui-components'

// The logo symbol before "Foodly" (mockup `.brand-mark`): 26 px in the sidebar, 24 px in the phone header.
export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-md bg-foreground text-background',
        small ? 'size-6' : 'size-6.5',
      )}
    >
      <ChefHat className={small ? 'size-3.5' : 'size-4'} />
    </span>
  )
}

// Symbol + wordmark (mockup `.brand` / `.m-brand`): sidebar, phone header on Start, sign-in pages.
export function Brand({ small = false, className }: { small?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark small={small} />
      {/* 17/700 is off the text scale (xl is 18). The display family without .font-display, whose weight and
          letter-spacing would beat these utilities (see PageTitle). */}
      <span className="font-(family-name:--font-display) text-[17px] font-bold tracking-[-0.02em]">Foodly</span>
    </span>
  )
}
