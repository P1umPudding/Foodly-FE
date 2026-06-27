import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, UtensilsCrossed } from 'lucide-react'
import { Card, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { TagText } from '../TagText'
import { TagChips } from './TagChips'
import { StarMeter } from './Stars'
import { RoleCollabIndicator } from './RoleCollabIndicator'
import { visibleRating } from '../../api/views'
import { recipeImageSrc } from '../../api/assets'
import { useCurrentUserId } from '../../catalog/CatalogProvider'
import type { Recipe } from '../../api/protocol'
import type { RoleFilter, CollabFilter } from '../../list/state'

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
      <StarMeter value={value} size="sm" />
      {value.toFixed(1)}
    </span>
  )
}

// The compact name truncates; only attach a tooltip when it actually overflows
// (measured), so non-truncated rows don't sprout a redundant tooltip.
function CompactName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [name])

  const label = (
    <span ref={ref} className="min-w-0 shrink truncate text-base font-medium text-foreground">
      <TagText value={name} />
    </span>
  )
  if (!truncated) return label
  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  )
}

export function RecipeRow({
  recipe,
  compact = false,
  activeRole = 'any',
  activeCollab = 'any',
}: {
  recipe: Recipe
  compact?: boolean
  activeRole?: RoleFilter
  activeCollab?: CollabFilter
}) {
  const rating = visibleRating(recipe, useCurrentUserId())
  const indicator = <RoleCollabIndicator recipe={recipe} activeRole={activeRole} activeCollab={activeCollab} />

  // Compact: one tight line — name · rating · time on the left, access + tags pinned
  // right. Time gives up width first (shrink-[100]), then the name; the name keeps a
  // tooltip only when it's actually clipped. No card box — a real list.
  if (compact) {
    return (
      <Link
        to={`/recipes/${recipe.id}`}
        className="group flex items-center gap-x-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
      >
        <div className="flex min-w-0 flex-1 items-center gap-x-3 text-sm text-muted-foreground">
          <CompactName name={recipe.name} />
          {rating !== null && <Rating value={rating} />}
          {recipe.time && (
            <span className="flex min-w-0 shrink-[100] items-center gap-1">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="truncate">
                <TagText value={recipe.time} />
              </span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-x-2">
          {indicator}
          <TagChips tags={recipe.tags} align="end" />
        </div>
      </Link>
    )
  }

  // Detailed: card with thumbnail. Name + rating/time on the left; tags pinned to the
  // right with the access icons beneath them.
  return (
    <Link to={`/recipes/${recipe.id}`} className="group block">
      <Card className="flex items-start gap-3 p-2 transition-colors hover:bg-muted/50">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {recipe.mainImage !== null ? (
            <img src={recipeImageSrc(recipe.mainImage)} alt="" className="h-full w-full object-cover" />
          ) : (
            // No own background → the row's hover background shows through.
            <UtensilsCrossed className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            <TagText value={recipe.name} />
          </span>
          {/* gap-x-6 gives rating and time clear breathing room */}
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {rating !== null && <Rating value={rating} />}
            {recipe.time && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" />
                <TagText value={recipe.time} />
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <TagChips tags={recipe.tags} align="end" />
          {indicator}
        </div>
      </Card>
    </Link>
  )
}
