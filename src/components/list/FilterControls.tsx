import type { ReactNode } from 'react'
import { Button, Separator, Skeleton } from '@postxl/ui-components'
import { X } from 'lucide-react'
import type { ListState } from '../../list/state'
import type { Tag, Ingredient, UserCategory } from '../../api/protocol'
import { CategoryFilter } from './filters/CategoryFilter'
import { TagFilter } from './filters/TagFilter'
import { IngredientFilter } from './filters/IngredientFilter'
import { DurationFilter } from './filters/DurationFilter'
import { AccessFilter } from './filters/AccessFilter'

// Reset link for a single facet — sits right-aligned next to the group heading,
// only while that facet has a selection.
function ClearButton({ onClick, label = 'Zurücksetzen' }: { onClick: () => void; label?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
    >
      <X className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}

// One labelled filter group — scannable structure across Kategorien, Tags, Zutaten,
// Arbeitszeit, Zugriff. `count` shows how many options are selected; `action` (the
// per-facet clear) is right-aligned in the heading row.
function FilterGroup({
  title,
  count,
  action,
  children,
}: {
  title: string
  count?: number
  action?: ReactNode
  children: ReactNode
}) {
  const heading = (
    <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
      {title}
      {count !== undefined && count > 0 && (
        <span className="tabular-nums text-xs font-normal text-muted-foreground">{count}</span>
      )}
    </h3>
  )
  return (
    <section className="flex flex-col gap-3">
      {/* The "Zurücksetzen" button is absolutely placed so it overlays the heading row
          (taller than the text) without changing its height — the heading, and the
          content below, stay put whether or not the button is shown. */}
      {action ? (
        <div className="relative">
          {heading}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">{action}</div>
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  )
}

// The filter rail (desktop) and the phone filter sheet: the five filter contents under one heading each.
// `onToggleCategory` and `uncategorizedCount` stay in the props for RecipeList but are unused — CategoryFilter
// selects through `set`, and "Ohne Kategorie" shows no count (B16). Both go in L7.
export function FilterControls({
  state,
  set,
  categories,
  categoriesLoading = false,
  tags,
  ingredients,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  categories: UserCategory[]
  categoriesLoading?: boolean
  onToggleCategory: (id: number) => void
  uncategorizedCount?: number
  tags: Tag[]
  ingredients: Ingredient[]
}) {
  // pr keeps the inner list scrollbars off the rail's own scrollbar.
  return (
    <div className="flex flex-col gap-4 pr-1.5">
      <FilterGroup
        title="Kategorien"
        count={state.categories.length}
        action={state.categories.length > 0 ? <ClearButton onClick={() => set({ categories: [] })} /> : undefined}
      >
        {categoriesLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <CategoryFilter categories={categories} selected={state.categories} set={set} />
        )}
      </FilterGroup>

      {tags.length > 0 && (
        <>
          <Separator />
          <FilterGroup
            title="Tags"
            count={state.tags.length}
            action={state.tags.length > 0 ? <ClearButton onClick={() => set({ tags: [] })} /> : undefined}
          >
            <TagFilter tags={tags} selected={state.tags} set={set} />
          </FilterGroup>
        </>
      )}

      {ingredients.length > 0 && (
        <>
          <Separator />
          <FilterGroup
            title="Zutaten"
            count={state.ingredients.length}
            action={state.ingredients.length > 0 ? <ClearButton onClick={() => set({ ingredients: [] })} /> : undefined}
          >
            <IngredientFilter ingredients={ingredients} selected={state.ingredients} set={set} />
          </FilterGroup>
        </>
      )}

      <Separator />

      {/* DurationFilter brings its own "Zurücksetzen" (it travels with it into the L6 popover). */}
      <FilterGroup title="Arbeitszeit">
        <DurationFilter value={state.durationMax} set={set} />
      </FilterGroup>

      <Separator />

      {/* Power-user facet, kept last. */}
      <FilterGroup title="Zugriff">
        <AccessFilter role={state.role} collab={state.collab} set={set} />
      </FilterGroup>
    </div>
  )
}
