import { Fragment, type ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { categoryColorVars } from '../../lib/categoryColor'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import type { UserCategory } from '../../api/protocol'

const MAX_DOTS = 3

// Not focusable on purpose: the whole row is one link, and focusable dots inside it
// would be invalid HTML plus extra tab stops per row (#103). Screen readers get the
// names from the sr-only text; the tooltips are a pointer-only extra on desktop.
export function CategoryDots({ categories }: { categories: UserCategory[] }) {
  const isDesktop = useIsDesktop()
  if (categories.length === 0) return null

  const shown = categories.slice(0, MAX_DOTS)
  const rest = categories.slice(MAX_DOTS)

  // Tooltips open left: the dots sit at the row's right edge.
  const withTooltip = (trigger: ReactElement, label: string) =>
    isDesktop ? (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="left">{label}</TooltipContent>
      </Tooltip>
    ) : (
      trigger
    )

  return (
    <span className="inline-flex shrink-0 items-center">
      <span className="sr-only">Kategorien: {categories.map((c) => c.name).join(', ')}</span>
      {shown.map((c) => (
        <Fragment key={c.id}>
          {/* p-1 widens the hit area around the 8 px dot */}
          {withTooltip(
            <span aria-hidden data-testid="category-dot" className="cursor-default p-1">
              <span {...categoryColorVars(c)} className="block size-2 rounded-full bg-cat-dot" />
            </span>,
            c.name,
          )}
        </Fragment>
      ))}
      {rest.length > 0 &&
        withTooltip(
          <span aria-hidden className="cursor-default p-1 text-xs tabular-nums text-muted-foreground">
            +{rest.length}
          </span>,
          rest.map((c) => c.name).join(', '),
        )}
    </span>
  )
}
