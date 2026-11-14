import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, UtensilsCrossed } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { TagText } from '../TagText'
import { plainTagText } from '../tagTokens'
import { TagChips } from './TagChips'
import { RatingMeta } from './Stars'
import { RoleCollabIndicator } from './RoleCollabIndicator'
import { CategoryDots } from './CategoryDots'
import { RecipeImage } from './RecipeImage'
import { formatMinutes, visibleRating } from '../../api/views'
import { useCurrentUserId, useTags, useUser } from '../../catalog/CatalogProvider'
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
    <span ref={ref} className="min-w-0 shrink truncate text-base font-medium text-foreground">
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

// Shared by both row kinds: a flat list row (no card, no border), hover fill and a focus ring in place of the card's.
const ROW =
  'group flex items-center rounded-md outline-none transition-colors hover:bg-hover focus-visible:ring-[3px] focus-visible:ring-ring/50'

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
  const me = useCurrentUserId()
  const owner = useUser(recipe.owner)
  const rating = visibleRating(recipe, me)
  const time = formatMinutes(recipe.overallMinutes)
  const ownerName = recipe.owner !== me ? owner?.name : undefined
  const indicator = <RoleCollabIndicator recipe={recipe} />
  const dots = <CategoryDots categories={categories} />
  // A photo that fails to load looks like no photo at all.
  const noPhoto = <UtensilsCrossed className="h-5 w-5 text-muted-foreground/40" />
  // Tags are hidden on phones; no wrapper at all without tags, so no empty flex gap.
  const tags = recipe.tags.length > 0 && (
    <div className="shrink-0 phone:hidden">
      <TagChips tags={recipe.tags} max={2} align="end" nowrap />
    </div>
  )

  // Compact: one line — name · rating · time, then tags → access → dots pinned right. The name gives up width
  // first (it keeps a tooltip only when actually clipped); the time never truncates. 34 px tall, 40 on touch.
  if (compact) {
    return (
      <Link to={`/recipes/${recipe.id}`} className={`${ROW} min-h-[34px] gap-3 px-3 py-1.5 touch:min-h-10`}>
        <CompactName name={recipe.name} />
        {rating !== null && (
          <span className="text-sm text-muted-foreground">
            <RatingMeta value={rating} />
          </span>
        )}
        {time && (
          <span
            data-testid="recipe-time"
            className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground"
          >
            {time}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {tags}
          {indicator}
          {dots}
        </span>
      </Link>
    )
  }

  // Detailed: thumbnail (only when the list has photos), name over ONE meta line (time, rating, "von <Name>"),
  // then tags → access → dots, all vertically centred in one row.
  return (
    <Link to={`/recipes/${recipe.id}`} className={`${ROW} gap-3.5 px-3 py-2.5`}>
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

      <div className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          <TagText value={recipe.name} />
        </span>
        {/* nowrap: phones keep it to one line too; the owner's name is what gets cut. h-lh: one line tall even when
            empty (own recipe without minutes or rating), so all rows keep the same height. */}
        <div
          data-testid="recipe-meta"
          className="mt-0.5 flex h-lh min-w-0 items-center gap-x-3 whitespace-nowrap text-sm text-muted-foreground"
        >
          {time && (
            <span data-testid="recipe-time" className="inline-flex shrink-0 items-center gap-1 tabular-nums">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {time}
            </span>
          )}
          {rating !== null && <RatingMeta value={rating} />}
          {ownerName && <span className="min-w-0 truncate">von {ownerName}</span>}
        </div>
      </div>

      {tags}
      {indicator}
      {dots}
    </Link>
  )
}
