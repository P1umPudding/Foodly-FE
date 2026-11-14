// The shared empty / no-results / error cards (design.md §5, mockup `#/states`): a card with the icon in a circle,
// a title, one sentence and at most one action. Errors are neutral, not a red alert.
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Info, RotateCcw } from 'lucide-react'
import { Button, Card, cn } from '@postxl/ui-components'

// design.md §7: actions stay 40 px tall on touch.
export const STATE_ACTION_CLASS = 'touch:h-10'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  role,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  // Inline variant (load-more, side panels): no icon, less padding.
  compact?: boolean
  role?: 'alert'
  className?: string
}) {
  return (
    <Card
      role={role}
      className={cn('flex flex-col items-center text-center', compact ? 'px-4 py-4' : 'p-7', className)}
    >
      {Icon && !compact && (
        <div
          data-testid="state-icon"
          className="mb-2.5 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <Icon aria-hidden className="size-5" />
        </div>
      )}
      <p className="font-semibold">{title}</p>
      {description && <div className="mt-0.5 max-w-sm text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </Card>
  )
}

// A failed load the user can retry in place.
export function ErrorState({
  title,
  description,
  onRetry,
  extraAction,
  compact = false,
  className,
}: {
  title: string
  description?: ReactNode
  onRetry: () => void
  // A way out next to the retry (Detail: "Zur Liste").
  extraAction?: ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <EmptyState
      role="alert"
      icon={Info}
      title={title}
      description={description}
      compact={compact}
      className={className}
      action={
        <>
          <Button variant="outline" size="sm" className={STATE_ACTION_CLASS} onClick={onRetry}>
            <RotateCcw aria-hidden />
            Erneut versuchen
          </Button>
          {extraAction}
        </>
      }
    />
  )
}
