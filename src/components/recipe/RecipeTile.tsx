import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { TagText } from '../TagText'
import { RatingMeta } from './Stars'
import { RoleCollabIndicator } from './RoleCollabIndicator'
import { CategoryLine } from './CategoryDots'
import { knowsUserNames } from '../../api'
import { visibleRating } from '../../api/views'
import { recipeImageSrc } from '../../api/assets'
import { useCurrentUserId, useUser } from '../../catalog/CatalogProvider'
import { useImageFailed } from './RecipeImage'
import type { Recipe, UserCategory } from '../../api/protocol'

// One recipe in the "Kacheln" view. Without a displayable photo the tile is a quiet
// typographic one (the name in the media slot, no second title) — never a fake image,
// and no category tint. `categories` are the ones to name (minus the surrounding group).
export function RecipeTile({ recipe, categories = [] }: { recipe: Recipe; categories?: UserCategory[] }) {
  const me = useCurrentUserId()
  const owner = useUser(recipe.owner)
  const rating = visibleRating(recipe, me)
  const src = recipe.mainImage !== null ? recipeImageSrc(recipe.mainImage) : null
  // A photo that fails to load turns the tile into the typographic one.
  const { failed, onError } = useImageFailed(src)
  const photo = failed ? null : src
  const ownerName = recipe.owner !== me && knowsUserNames() ? owner?.name : undefined

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="group flex min-w-0 flex-col gap-2 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        {photo !== null ? (
          <img
            src={photo}
            alt=""
            loading="lazy"
            onError={onError}
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-end p-4 transition-colors group-hover:bg-foreground/5">
            <span
              data-testid="tile-type-name"
              className="line-clamp-3 break-words hyphens-auto text-[22px] leading-[1.15] font-[750] tracking-[-0.02em] text-muted-foreground phone:text-[17px]"
            >
              <TagText value={recipe.name} size="lg" />
            </span>
          </div>
        )}
      </div>

      {/* Title first in the DOM so the link reads name-first; the category line moves up visually. */}
      <div className="flex min-w-0 flex-col gap-0.5">
        {photo !== null && (
          <span className="line-clamp-2 break-words hyphens-auto text-[17px] leading-tight font-bold tracking-[-0.015em] phone:text-lg">
            <TagText value={recipe.name} size="lg" />
          </span>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground phone:gap-x-2 phone:text-xs">
          {recipe.time && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <TagText value={recipe.time} />
            </span>
          )}
          {rating !== null && <RatingMeta value={rating} />}
          {ownerName && <span>von {ownerName}</span>}
          <RoleCollabIndicator recipe={recipe} />
        </div>
        {categories.length > 0 && (
          <div className="order-first min-w-0">
            <CategoryLine categories={categories} />
          </div>
        )}
      </div>
    </Link>
  )
}
