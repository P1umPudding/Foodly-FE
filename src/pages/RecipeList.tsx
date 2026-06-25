import { useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
} from '@postxl/ui-components'
import { X, Filter } from 'lucide-react'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useCurrentUserId, useTags, useIngredients } from '../catalog/CatalogProvider'
import { useListState } from '../list/useListState'
import { filterRecipes, groupingCategories } from '../list/filter'
import { sortRecipes } from '../list/sort'
import { usedIngredients } from '../list/counts'
import { isFilterActive } from '../list/state'
import { FilterControls } from '../components/list/FilterControls'
import { ListToolbar } from '../components/list/ListToolbar'
import { RecipeListView } from '../components/list/RecipeListView'
import { ResultCount } from '../components/list/ResultCount'

export function RecipeList() {
  const [nonce, setNonce] = useState(0)
  const recipesReq = useRequest(() => foodly.listRecipes(), [nonce])
  const categoriesReq = useRequest(() => foodly.listCategories(), [nonce])
  const { state, set, clear } = useListState()
  const currentUserId = useCurrentUserId()
  const tags = useTags()
  const ingredients = useIngredients()

  const allRecipes = recipesReq.data ?? []
  const categories = categoriesReq.data ?? []
  const tagList = Object.values(tags.byId)
  const usedIngredientList = usedIngredients(allRecipes, ingredients.byId)
  const visible = sortRecipes(filterRecipes(allRecipes, state, currentUserId, categories), state, currentUserId)

  const filters = (
    <FilterControls
      state={state}
      set={set}
      categories={categories}
      onToggleCategory={(id) =>
        set({
          categories: state.categories.includes(id)
            ? state.categories.filter((x) => x !== id)
            : [...state.categories, id],
        })
      }
      tags={tagList}
      ingredients={usedIngredientList}
    />
  )

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 md:grid-cols-[1fr_18rem]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-3xl text-foreground">Rezepte</h1>
            <ResultCount matching={visible.length} total={allRecipes.length} />
          </div>
          <div className="flex items-center gap-3">
            <ListToolbar state={state} set={set} />
            {/* Mobile-only filter drawer trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 md:hidden">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[20rem] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filter</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{filters}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="relative mb-6">
          <Input
            placeholder="Rezepte suchen…"
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            className="w-full pr-9 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {state.search !== '' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Suche leeren"
              onClick={() => set({ search: '' })}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {recipesReq.status === 'loading' && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {recipesReq.status === 'error' && (
          <Alert variant="destructive">
            <AlertTitle>Konnte Rezepte nicht laden</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{recipesReq.error?.message}</span>
              <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
                Erneut versuchen
              </Button>
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
              <Button variant="outline" size="sm" onClick={clear}>
                Filter zurücksetzen
              </Button>
            )}
          </div>
        )}

        {recipesReq.status === 'ready' && visible.length > 0 && (
          <RecipeListView
            recipes={visible}
            categories={groupingCategories(categories, state.categories)}
            detail={state.detail}
          />
        )}
      </div>

      {/* Desktop rail (right) */}
      <aside className="hidden md:sticky md:top-4 md:flex md:flex-col md:gap-4 md:self-start">{filters}</aside>
    </div>
  )
}
