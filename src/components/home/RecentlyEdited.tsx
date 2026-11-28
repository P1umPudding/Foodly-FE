// "Zuletzt bearbeitet": all recipes the user can open, last edited first. On REST src/api sorts page 1 itself until
// backend #16 sorts by updatedAt.
import { foodly } from '../../api'
import type { RecipeSearchQuery } from '../../api/protocol'
import { useCategories, useCurrentUserId } from '../../catalog/CatalogProvider'
import { useRequest } from '../../hooks/useRequest'
import { loadPersisted } from '../../list/persistence'
import { recipeCategories } from '../../list/rowData'
import { TileSkeleton } from '../list/ListSkeleton'
import { RecipeTile } from '../recipe/RecipeTile'
import { listHref, navPrefs } from '../shell/nav'
import { HomeSection } from './HomeSection'
import { HomeTileGrid } from './HomeTileGrid'

const SHOWN = 6

const LAST_EDITED_FIRST: RecipeSearchQuery = { sort: { field: 'updatedAt', order: 'desc' } }

export function RecentlyEdited() {
  const userId = useCurrentUserId()
  const categories = useCategories()
  const { status, data, error, reload } = useRequest(
    () => foodly.searchRecipes(LAST_EDITED_FIRST, 1),
    // Safeguard: CatalogProvider renders us only once the user is known, but access must follow a user switch.
    [userId],
  )
  const recipes = data?.items.slice(0, SHOWN) ?? []
  const state = status === 'ready' && recipes.length === 0 ? 'empty' : status
  // Same view prefs as the nav's "Rezepte" link (useNavState).
  const allHref = listHref([], navPrefs('/', new URLSearchParams(), loadPersisted(userId)))

  return (
    <HomeSection
      title="Zuletzt bearbeitet"
      link={{ label: 'Alle Rezepte', to: allHref }}
      state={state}
      onRetry={reload}
      errorMessage={error?.message}
      skeleton={
        <HomeTileGrid>
          {Array.from({ length: SHOWN }, (_, i) => (
            <TileSkeleton key={i} />
          ))}
        </HomeTileGrid>
      }
    >
      <HomeTileGrid>
        {recipes.map((r) => (
          <RecipeTile key={r.id} recipe={r} categories={recipeCategories(r, categories.list)} />
        ))}
      </HomeTileGrid>
    </HomeSection>
  )
}
