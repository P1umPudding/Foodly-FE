// The page title of the mockup (`.page-title`, 26/650).
import type { ReactNode } from 'react'
import { cn } from '@postxl/ui-components'

export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // The display family without .font-display: that class is emitted after the utilities, so its letter-spacing
    // would beat the tracking here. No colour of its own: it inherits, callers tint it (category head: cat-ink).
    <h1
      data-slot="page-title"
      className={cn(
        'font-(family-name:--font-display) text-2xl/[1.15] font-[650] tracking-[-0.025em] break-words',
        className,
      )}
    >
      {children}
    </h1>
  )
}
