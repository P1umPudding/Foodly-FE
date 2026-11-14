// A section heading of the mockup (`.section-h`): h2 15/600 with an optional quiet link on the right.
import { Link } from 'react-router-dom'
import { cn } from '@postxl/ui-components'
import { FOCUS_RING } from './focusRing'

export function SectionHeader({ id, title, link }: { id?: string; title: string; link?: { label: string; to: string } }) {
  return (
    <div data-slot="section-header" className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-lg font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      {link && (
        <Link
          to={link.to}
          className={cn(
            FOCUS_RING,
            // inline-flex keeps the first-line baseline, so the 40 px touch target (design.md §7) still aligns.
            'inline-flex items-center rounded-xs text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 touch:min-h-10',
          )}
        >
          {link.label}
        </Link>
      )}
    </div>
  )
}
