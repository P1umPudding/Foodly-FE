// "Geteilt mit dir": the side column of the start page (mockup `#/home` aside). Recipes others shared with me, the
// newest share first: for an editor or viewer, accessSince is when the access was granted (backend #22), so the server
// does the ordering.
import { Link } from 'react-router-dom'
import { Card } from '@postxl/ui-components'
import { foodly } from '../../api'
import type { Recipe, RecipeSearchQuery } from '../../api/protocol'
import { useCurrentUserId, useUser } from '../../catalog/CatalogProvider'
import { useRequest } from '../../hooks/useRequest'
import { hasDisplayableImages } from '../../list/rowData'
import { RecipeThumb } from '../recipe/RecipeThumb'
import { ROW_DIVIDER } from '../rowDivider'
import { Skeleton } from '../Skeleton'
import { TagText } from '../TagText'
import { HomeSection } from './HomeSection'

const SHOWN = 3

const SHARED_NEWEST_FIRST: RecipeSearchQuery = {
  filters: { accessRights: ['editor', 'viewer'] },
  sort: { field: 'accessSince', order: 'desc' },
}

export function SharedWithYou() {
  const userId = useCurrentUserId()
  const { status, data, error, reload } = useRequest(
    () => foodly.searchRecipes(SHARED_NEWEST_FIRST, 1),
    // "Shared with me" must follow a user switch, like RecentCreations.
    [userId],
  )
  const recipes = data?.items.slice(0, SHOWN) ?? []
  const state = status === 'ready' && recipes.length === 0 ? 'empty' : status
  // Redesign §1.5: no photo among them, no image column.
  const showImages = hasDisplayableImages(recipes)

  return (
    <HomeSection
      title="Geteilt mit dir"
      state={state}
      onRetry={reload}
      errorMessage={error?.message}
      skeleton={
        <Card data-testid="shared-skeleton" className="p-1">
          {Array.from({ length: SHOWN }, (_, i) => (
            // Built like a real row (padding, a body line and a text-sm meta line, each h-lh of its text size), so
            // nothing jumps; no thumbnail, photos are known only after loading.
            <div key={i} className={`${ROW_DIVIDER} px-3 py-2.5`}>
              <div data-testid="shared-skeleton-line" className="flex h-lh items-center">
                <Skeleton className="h-3 w-[60%] rounded-sm" />
              </div>
              <div data-testid="shared-skeleton-line" className="mt-0.5 flex h-lh items-center text-sm">
                <Skeleton className="h-2.5 w-[35%] rounded-sm" />
              </div>
            </div>
          ))}
        </Card>
      }
    >
      <Card className="p-1">
        <ul aria-label="Geteilte Rezepte">
          {recipes.map((r) => (
            <SharedRow key={r.id} recipe={r} showImage={showImages} />
          ))}
        </ul>
      </Card>
    </HomeSection>
  )
}

function SharedRow({ recipe, showImage }: { recipe: Recipe; showImage: boolean }) {
  const owner = useUser(recipe.owner)
  return (
    <li className={ROW_DIVIDER}>
      <Link
        to={`/recipes/${recipe.id}`}
        className="flex items-center gap-3.5 rounded-sm px-3 py-2.5 outline-none transition-colors hover:bg-hover focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {showImage && <RecipeThumb image={recipe.mainImage} size="sm" testId="shared-thumb" />}
        <div className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            <TagText value={recipe.name} />
          </span>
          {/* Empty while the owner's name is still unknown (as in RecipeRow), but one line tall, so the row doesn't grow
              when it arrives. */}
          <span className="mt-0.5 block h-lh truncate text-sm text-muted-foreground">
            {owner && `von ${owner.name}`}
          </span>
        </div>
      </Link>
    </li>
  )
}
