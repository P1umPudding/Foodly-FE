import { Link } from 'react-router-dom'
import { Star, Clock, UtensilsCrossed } from 'lucide-react'
import { Card } from '@postxl/ui-components'
import { TagText } from '../TagText'
import { TagChips } from './TagChips'
import { RoleCollabIndicator } from './RoleCollabIndicator'
import { visibleRating } from '../../api/views'
import { recipeImageSrc } from '../../api/assets'
import { useCurrentUserId } from '../../catalog/CatalogProvider'
import type { Recipe } from '../../api/protocol'
import type { RoleFilter, CollabFilter } from '../../list/state'

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

  return (
    <Link to={`/recipes/${recipe.id}`} className="group block">
      <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
        {!compact && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {recipe.mainImage !== null ? (
              <img src={recipeImageSrc(recipe.mainImage)} alt="" className="h-full w-full object-cover" />
            ) : (
              // No own background → the row's hover background shows through.
              <UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Name + ownership + tags flow together from the left — no justify-between,
              so on a wide row the tags stay next to the name instead of drifting far right. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">
                <TagText value={recipe.name} />
              </span>
              <span className="shrink-0">
                <RoleCollabIndicator recipe={recipe} activeRole={activeRole} activeCollab={activeCollab} />
              </span>
            </span>
            <TagChips tags={recipe.tags} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {rating !== null && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="h-4 w-4 fill-current text-star" />
                {rating.toFixed(1)}
              </span>
            )}
            {recipe.time && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <TagText value={recipe.time} />
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
