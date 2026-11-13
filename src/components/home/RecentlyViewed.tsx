// "Zuletzt angesehen": the first 6 stored recipes, in stored order. Recipes that fail to load drop out silently.
import { useMemo } from 'react'
import { foodly } from '../../api'
import type { Recipe, RecipeId, UserId } from '../../api/protocol'
import { useCategories, useCurrentUserId } from '../../catalog/CatalogProvider'
import { useRequest } from '../../hooks/useRequest'
import { readRecentlyViewed, removeRecentlyViewed } from '../../home/recentlyViewed'
import { recipeCategories } from '../../list/rowData'
import { TileSkeleton } from '../list/ListSkeleton'
import { RecipeTile } from '../recipe/RecipeTile'
import { HomeSection } from './HomeSection'
import { HomeTileGrid } from './HomeTileGrid'

const SHOWN = 6

async function loadRecipes(userId: UserId, ids: RecipeId[]): Promise<Recipe[]> {
  const results = await Promise.allSettled(ids.map((id) => foodly.getRecipe(id)))
  const loaded = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  // The transport's errors carry no status, so a deleted recipe looks like being offline. Only forget the failed
  // ids when another one loaded, so a dead connection doesn't wipe the list; a one-off 5xx next to a success does
  // drop that recipe (accepted). Recipes deleted in this app are removed by RecipeDetail's delete handler. (Runs twice under StrictMode;
  // harmless, removing re-reads and filters.)
  if (loaded.length > 0 && loaded.length < ids.length) {
    removeRecentlyViewed(
      userId,
      ids.filter((_, i) => results[i].status === 'rejected'),
    )
  }
  return loaded
}

export function RecentlyViewed() {
  const userId = useCurrentUserId()
  const categories = useCategories()
  // One snapshot per mount, read synchronously so the section is 'empty' from the first render when nothing is
  // stored. Removed ids are not backfilled until the next visit.
  const ids = useMemo(() => (userId === null ? [] : readRecentlyViewed(userId).slice(0, SHOWN)), [userId])
  const { status, data } = useRequest(
    () => (userId === null || ids.length === 0 ? Promise.resolve([]) : loadRecipes(userId, ids)),
    [ids],
  )
  const recipes = data ?? []
  const state = ids.length === 0 ? 'empty' : status === 'loading' ? 'loading' : recipes.length === 0 ? 'empty' : 'ready'

  return (
    <HomeSection
      title="Zuletzt angesehen"
      state={state}
      // Never 'error': failed recipes just drop out.
      onRetry={() => {}}
      skeleton={
        <HomeTileGrid>
          {ids.map((id) => (
            <TileSkeleton key={id} />
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
