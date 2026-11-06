import { Fragment, type ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { categoryColorVars } from '../../lib/categoryColor'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import type { UserCategory } from '../../api/protocol'

const MAX_DOTS = 3

type TooltipSide = 'left' | 'top'

// The tooltips are a pointer-only extra on desktop; phones have no hover.
function useDesktopTooltip(side: TooltipSide) {
  const isDesktop = useIsDesktop()
  return (trigger: ReactElement, label: string) =>
    isDesktop ? (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={side}>{label}</TooltipContent>
      </Tooltip>
    ) : (
      trigger
    )
}

// Not focusable on purpose: the whole row is one link, and focusable dots inside it
// would be invalid HTML plus extra tab stops per row (#103). Screen readers get the
// names from the sr-only text. Tooltips open left by default: in rows the dots sit at
// the right edge. `showMore` off leaves the "+n" to the caller (CategoryLine).
export function CategoryDots({
  categories,
  tooltipSide = 'left',
  showMore = true,
}: {
  categories: UserCategory[]
  tooltipSide?: TooltipSide
  showMore?: boolean
}) {
  const withTooltip = useDesktopTooltip(tooltipSide)
  if (categories.length === 0) return null

  const shown = categories.slice(0, MAX_DOTS)
  const rest = categories.slice(MAX_DOTS)

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
      {showMore &&
        rest.length > 0 &&
        withTooltip(
          <span aria-hidden className="cursor-default p-1 text-xs tabular-nums text-muted-foreground">
            +{rest.length}
          </span>,
          rest.map((c) => c.name).join(', '),
        )}
    </span>
  )
}

// Tile variant: dots, then the first category's name, then "+n" for all the others. Name
// and count are aria-hidden — the dots' sr-only text already lists every category.
export function CategoryLine({ categories }: { categories: UserCategory[] }) {
  const withTooltip = useDesktopTooltip('top')
  if (categories.length === 0) return null

  const [first, ...others] = categories
  return (
    // -ml-1 lines the first dot up with the tile edge (the dots carry p-1 hit areas).
    <span
      data-testid="category-line"
      className="-ml-1 flex min-w-0 items-center text-sm font-medium text-muted-foreground"
    >
      <CategoryDots categories={categories} tooltipSide="top" showMore={false} />
      <span aria-hidden data-testid="category-line-name" className="ml-0.5 min-w-0 truncate">
        {first.name}
      </span>
      {others.length > 0 &&
        withTooltip(
          <span aria-hidden className="shrink-0 cursor-default pl-1 tabular-nums">
            +{others.length}
          </span>,
          others.map((c) => c.name).join(', '),
        )}
    </span>
  )
}
