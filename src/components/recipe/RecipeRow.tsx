import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, UtensilsCrossed } from 'lucide-react'
import { Card, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { TagText } from '../TagText'
import { plainTagText } from '../tagTokens'
import { TagChips } from './TagChips'
import { RatingMeta } from './Stars'
import { RoleCollabIndicator } from './RoleCollabIndicator'
import { CategoryDots } from './CategoryDots'
import { RecipeImage } from './RecipeImage'
import { visibleRating } from '../../api/views'
import { useCurrentUserId, useTags } from '../../catalog/CatalogProvider'
import type { Recipe, UserCategory } from '../../api/protocol'

// The compact name truncates; only attach a tooltip when it actually overflows
// (measured), so non-truncated rows don't sprout a redundant tooltip.
function CompactName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = useState(false)
  const { byId: tags } = useTags()
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
    <span ref={ref} className="min-w-0 shrink truncate text-[15px] font-medium text-foreground">
      <TagText value={name} />
    </span>
  )
  if (!truncated) return label
  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      {/* Plain text, not <TagText>: tag icons would sit on the tooltip's inverted background. */}
      <TooltipContent>{plainTagText(name, tags)}</TooltipContent>
    </Tooltip>
  )
}

// `categories` are this recipe's categories to show as dots (already ordered, minus
// the surrounding group). `showImages` is decided list-wide, so all rows line up.
export function RecipeRow({
  recipe,
  compact = false,
  categories = [],
  showImages = false,
}: {
  recipe: Recipe
  compact?: boolean
  categories?: UserCategory[]
  showImages?: boolean
}) {
  const rating = visibleRating(recipe, useCurrentUserId())
  const indicator = <RoleCollabIndicator recipe={recipe} />
  const dots = <CategoryDots categories={categories} />
  // A photo that fails to load looks like no photo at all.
  const noPhoto = <UtensilsCrossed className="h-5 w-5 text-muted-foreground/40" />
  // Tags are hidden on phones; no wrapper at all without tags, so no empty flex gap.
  const tags = recipe.tags.length > 0 && (
    <div className="phone:hidden">
      <TagChips tags={recipe.tags} align="end" />
    </div>
  )

  // Compact: one tight line — name · rating · time on the left, access + tags + dots
  // pinned right. Time gives up width first (shrink-[100]), then the name; the name keeps a
  // tooltip only when it's actually clipped. No card box — a real list.
  if (compact) {
    return (
      <Link
        to={`/recipes/${recipe.id}`}
        className="group flex items-center gap-x-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
      >
        <div className="flex min-w-0 flex-1 items-center gap-x-3 text-sm text-muted-foreground">
          <CompactName name={recipe.name} />
          {rating !== null && <RatingMeta value={rating} />}
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
          {tags}
          {dots}
        </div>
      </Link>
    )
  }

  // Detailed: card with a 48 px content height (thumbnail when the list has photos,
  // otherwise min-h-12 on the text column, so rows stay uniform either way). The
  // columns pin their two rows to the extremes — name & tags up top, rating/time &
  // access icons + dots at the bottom.
  return (
    <Link to={`/recipes/${recipe.id}`} className="group block">
      <Card className="flex items-stretch gap-3 p-2 transition-colors hover:bg-muted/50">
        {showImages && (
          <div
            data-testid="recipe-thumb"
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"
          >
            {recipe.mainImage !== null ? (
              <RecipeImage image={recipe.mainImage} alt="" className="h-full w-full object-cover" fallback={noPhoto} />
            ) : (
              noPhoto
            )}
          </div>
        )}

        <div className="flex min-h-12 min-w-0 flex-1 flex-col justify-between gap-0.5">
          {/* leading-tight: the inherited 1.6 line-height otherwise makes the name
              taller than the thumbnail and unbalances the box's top/bottom padding.
              pb-0.5 (paired with the smaller gap above) keeps room inside the
              truncate/overflow box for descenders, which would otherwise clip. */}
          <span className="block truncate pb-0.5 font-medium leading-tight">
            <TagText value={recipe.name} />
          </span>
          {/* gap-x-6 gives rating and time clear breathing room */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {rating !== null && <RatingMeta value={rating} />}
            {recipe.time && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" />
                <TagText value={recipe.time} />
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end justify-between gap-1">
          {tags}
          {/* mt-auto keeps this row at the bottom when there are no (visible) tags */}
          <div className="mt-auto flex items-center gap-2">
            {indicator}
            {dots}
          </div>
        </div>
      </Card>
    </Link>
  )
}
