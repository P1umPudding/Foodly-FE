import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@postxl/ui-components';
import { foodly } from '../api';
import { useRequest } from '../hooks/useRequest';
import { useCurrentUserId, useTags, useIngredients } from '../catalog/CatalogProvider';
import { useListState } from '../list/useListState';
import { filterRecipes } from '../list/filter';
import { sortRecipes } from '../list/sort';
import { roleGridCounts, usedIngredients } from '../list/counts';
import { isFilterActive } from '../list/state';
import { CategorySidebar } from '../components/list/CategorySidebar';
import { FilterControls } from '../components/list/FilterControls';
import { RecipeListView } from '../components/list/RecipeListView';

export function RecipeList() {
  const [nonce, setNonce] = useState(0);
  const recipesReq = useRequest(() => foodly.listRecipes(), [nonce]);
  const categoriesReq = useRequest(() => foodly.listCategories(), [nonce]);
  const { state, set, clear } = useListState();
  const currentUserId = useCurrentUserId();
  const tags = useTags();
  const ingredients = useIngredients();

  const allRecipes = recipesReq.data ?? [];
  const categories = categoriesReq.data ?? [];
  const tagList = Object.values(tags.byId);
  const usedIngredientList = usedIngredients(allRecipes, ingredients.byId);
  const gridCounts = roleGridCounts(allRecipes, state, currentUserId, categories);

  const visible = sortRecipes(
    filterRecipes(allRecipes, state, currentUserId, categories),
    state, currentUserId,
  );

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 md:grid-cols-[14rem_1fr]">
      <aside className="md:sticky md:top-4 md:self-start">
        <CategorySidebar
          categories={categories}
          selected={state.categories}
          onToggle={(id) => set({
            categories: state.categories.includes(id)
              ? state.categories.filter((x) => x !== id)
              : [...state.categories, id],
          })}
        />
      </aside>

      <div className="min-w-0">
        <h1 className="font-display mb-6 text-3xl text-foreground">Rezepte</h1>

        <div className="mb-6">
          <FilterControls
            state={state} set={set}
            tags={tagList} ingredients={usedIngredientList} gridCounts={gridCounts}
          />
        </div>

        {recipesReq.status === 'loading' && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        )}

        {recipesReq.status === 'error' && (
          <Alert variant="destructive">
            <AlertTitle>Konnte Rezepte nicht laden</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{recipesReq.error?.message}</span>
              <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>Erneut versuchen</Button>
            </AlertDescription>
          </Alert>
        )}

        {recipesReq.status === 'ready' && allRecipes.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">Noch keine Rezepte.</p>
        )}

        {recipesReq.status === 'ready' && allRecipes.length > 0 && visible.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">Keine Treffer für die aktuellen Filter.</p>
            {isFilterActive(state) && (
              <Button variant="outline" size="sm" onClick={clear}>Filter zurücksetzen</Button>
            )}
          </div>
        )}

        {recipesReq.status === 'ready' && visible.length > 0 && (
          <RecipeListView recipes={visible} categories={categories} group={state.group} detail={state.detail} />
        )}
      </div>
    </div>
  );
}
