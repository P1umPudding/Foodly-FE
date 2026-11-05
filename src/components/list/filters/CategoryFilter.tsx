import { categoryColorVars } from '../../../lib/categoryColor'
import { UNCATEGORIZED_ID } from '../../../list/filter'
import type { ListState } from '../../../list/state'
import type { UserCategory } from '../../../api/protocol'
import { FilterCheckRow } from './FilterCheckRow'
import { toggle } from './toggle'

// Multi-select (OR). Filters only, never navigates — the category page is reached via the sidebar.
export function CategoryFilter({
  categories,
  selected,
  set,
}: {
  categories: UserCategory[]
  selected: number[]
  set: (patch: Partial<ListState>) => void
}) {
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const onToggle = (id: number) => set({ categories: toggle(selected, id) })
  return (
    // Capped so a long category list scrolls within its own section.
    <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
      {/* No count: uncategorised recipes could only be counted over the loaded pages (B16).
          No data-cat, so the neutral --cat-* defaults colour its dot. */}
      <FilterCheckRow
        checked={selected.includes(UNCATEGORIZED_ID)}
        onToggle={() => onToggle(UNCATEGORIZED_ID)}
      >
        <CategoryLabel name="Ohne Kategorie" />
      </FilterCheckRow>
      {ordered.map((c) => (
        <FilterCheckRow
          key={c.id}
          checked={selected.includes(c.id)}
          onToggle={() => onToggle(c.id)}
          {...categoryColorVars(c)}
        >
          <CategoryLabel name={c.name} count={c.recipes.length} />
        </FilterCheckRow>
      ))}
    </div>
  )
}

function CategoryLabel({ name, count }: { name: string; count?: number }) {
  return (
    <span className="flex w-full min-w-0 items-center gap-2">
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-cat-dot" />
      <span className="truncate">{name}</span>
      {count !== undefined && (
        <>
          <span aria-hidden className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
            {count}
          </span>
          <span className="sr-only">{`, ${count} Rezepte`}</span>
        </>
      )}
    </span>
  )
}
