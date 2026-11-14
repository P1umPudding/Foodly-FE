import { ChefHat } from 'lucide-react'
import { cn } from '@postxl/ui-components'

// The logo symbol before "Foodly" (mockup `.brand-mark`): 26 px in the sidebar, 24 px in the phone header.
export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-md bg-foreground text-background',
        small ? 'size-6' : 'size-[26px]',
      )}
    >
      <ChefHat className={small ? 'size-3.5' : 'size-4'} />
    </span>
  )
}
