import { cn } from '@postxl/ui-components'
import { categoryColorVars } from '../../../lib/categoryColor'
import { UNCATEGORIZED_ID } from '../../../list/filter'
import type { ListState } from '../../../list/state'
import type { UserCategory } from '../../../api/protocol'
import { FilterCheckRow, FilterHint } from './FilterCheckRow'
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
    <div className="flex flex-col">
      {/* Capped so a long category list scrolls within its own section; the hint stays below it. */}
      <div className="flex max-h-72 flex-col overflow-y-auto phone:max-h-[50vh]">
        {/* No count: uncategorised recipes could only be counted over the loaded pages (B16). No data-cat; the
            hollow dot marks "no category" (mockup cat-dot none). */}
        <FilterCheckRow
          look="filter"
          checked={selected.includes(UNCATEGORIZED_ID)}
          onToggle={() => onToggle(UNCATEGORIZED_ID)}
        >
          <CategoryLabel name="Ohne Kategorie" hollow />
        </FilterCheckRow>
        {ordered.map((c) => (
          <FilterCheckRow
            key={c.id}
            look="filter"
            checked={selected.includes(c.id)}
            onToggle={() => onToggle(c.id)}
            {...categoryColorVars(c)}
          >
            <CategoryLabel name={c.name} count={c.recipes.length} />
          </FilterCheckRow>
        ))}
      </div>
      <FilterHint>Mehrere = Rezepte aus einer davon.</FilterHint>
    </div>
  )
}

export function CategoryLabel({ name, count, hollow = false }: { name: string; count?: number; hollow?: boolean }) {
  return (
    <span className="flex w-full min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={cn(
          'size-2 shrink-0 rounded-full bg-cat-dot',
          hollow && 'border-[1.5px] border-border-strong bg-transparent',
        )}
      />
      <span className="truncate">{name}</span>
      {count !== undefined && (
        <>
          <span aria-hidden className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
            {count}
          </span>
          <span className="sr-only">{`, ${count} ${count === 1 ? 'Rezept' : 'Rezepte'}`}</span>
        </>
      )}
    </span>
  )
}
