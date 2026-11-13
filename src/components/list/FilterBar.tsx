import { Skeleton } from '@postxl/ui-components'
import type { ListState } from '../../list/state'
import { filterLabels } from '../../list/filterLabels'
import { UNCATEGORIZED_ID } from '../../list/filter'
import type { Ingredient, Tag, UserCategory } from '../../api/protocol'
import type { CategoriesStatus } from '../../catalog/CatalogProvider'
import { FilterButton } from './FilterButton'
import { CategoryFilter } from './filters/CategoryFilter'
import { TagFilter } from './filters/TagFilter'
import { IngredientFilter } from './filters/IngredientFilter'
import { DurationFilter } from './filters/DurationFilter'
import { AccessFilter } from './filters/AccessFilter'
import { NoMatches } from './filters/FilterCheckRow'

// The filter row under the search: one button per filter, its content in a popover (desktop) or sheet (phone).
// Wraps on the desktop, where a hidden scrollbar would leave buttons out of a mouse's reach next to the expanded
// sidebar; on phones it scrolls sideways instead, edge to edge. py-1 there: overflow-x forces overflow-y too,
// which would clip the buttons' 3-px focus ring.
export function FilterBar({
  state,
  set,
  categories,
  categoriesStatus = 'ready',
  tags,
  ingredients,
  labelIngredients,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  categories: UserCategory[]
  categoriesStatus?: CategoriesStatus
  tags: Tag[]
  // Options to pick from (may be only those on the loaded recipes).
  ingredients: Ingredient[]
  // Full catalog, so a selected ingredient that no loaded recipe uses still reads by name.
  labelIngredients: Ingredient[]
}) {
  const labels = filterLabels(state, { categories, ingredients: labelIngredients })
  // While the categories load, a filter from the URL would flash "#3" (the other catalogs load before the page
  // renders). "Ohne Kategorie" needs no catalog. After a load error the list passes no category selection: it is
  // ignored until a retry succeeds.
  const unresolved = categoriesStatus === 'loading' && state.categories.some((id) => id !== UNCATEGORIZED_ID)
  const categoryValue = unresolved && labels.category ? { first: '…', more: 0 } : labels.category
  return (
    <div
      role="group"
      aria-label="Filter"
      className="flex flex-wrap gap-2 phone:-mx-6 phone:-my-1 phone:flex-nowrap phone:overflow-x-auto phone:px-6 phone:py-1 phone:*:shrink-0 phone:[scrollbar-width:none] phone:[&::-webkit-scrollbar]:hidden"
    >
      <FilterButton label="Kategorie" value={categoryValue} onClear={() => set({ categories: [] })}>
        {categoriesStatus === 'loading' ? (
          <div data-testid="category-skeleton" className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : categoriesStatus === 'error' ? (
          // The list shows the error with its retry; offering a selection here would write a filter that is ignored.
          <NoMatches>Kategorien nicht verfügbar</NoMatches>
        ) : (
          <CategoryFilter categories={categories} selected={state.categories} set={set} />
        )}
      </FilterButton>
      <FilterButton label="Tags" value={labels.tags} onClear={() => set({ tags: [] })}>
        {tags.length === 0 ? (
          <NoMatches>Keine Tags</NoMatches>
        ) : (
          <TagFilter tags={tags} selected={state.tags} set={set} />
        )}
      </FilterButton>
      <FilterButton label="Zutaten" value={labels.ingredients} onClear={() => set({ ingredients: [] })}>
        {ingredients.length === 0 ? (
          <NoMatches>Keine Zutaten</NoMatches>
        ) : (
          <IngredientFilter ingredients={ingredients} selected={state.ingredients} set={set} />
        )}
      </FilterButton>
      <FilterButton label="Arbeitszeit" value={labels.duration} onClear={() => set({ durationMax: null })}>
        <DurationFilter value={state.durationMax} set={set} />
      </FilterButton>
      <FilterButton label="Zugriff" value={labels.access} onClear={() => set({ role: 'any', collab: 'any' })}>
        <AccessFilter role={state.role} collab={state.collab} set={set} />
      </FilterButton>
    </div>
  )
}
