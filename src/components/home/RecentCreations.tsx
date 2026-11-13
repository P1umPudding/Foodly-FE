// "Zuletzt erstellt": the user's own recipes, newest first. For an owner, accessSince is the creation time
// (backend #22), so the server does the ordering.
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

const OWN_NEWEST_FIRST: RecipeSearchQuery = {
  filters: { accessRights: ['owner'] },
  sort: { field: 'accessSince', order: 'desc' },
}

export function RecentCreations() {
  const userId = useCurrentUserId()
  const categories = useCategories()
  const { status, data, error, reload } = useRequest(() => foodly.searchRecipes(OWN_NEWEST_FIRST, 1), [])
  const recipes = data?.items.slice(0, SHOWN) ?? []
  const state = status === 'ready' && recipes.length === 0 ? 'empty' : status
  // Same view prefs as the nav's "Rezepte" link (useNavState), narrowed to the user's own recipes.
  const allHref = listHref([], navPrefs('/', new URLSearchParams(), loadPersisted(userId)), 'owner')

  return (
    <HomeSection
      title="Zuletzt erstellt"
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
