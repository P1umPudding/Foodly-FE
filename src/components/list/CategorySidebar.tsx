import { Button } from '@postxl/ui-components'
import { categoryColorVars, type CategoryColorInput } from '../../lib/categoryColor'
import { UNCATEGORIZED_ID } from '../../list/filter'
import type { UserCategory } from '../../api/protocol'

// Full-width stacked toggles: dot, name, count. Inactive = category line as outline;
// active = the soft category fill with ink text. Hovering an inactive toggle stays
// neutral so "hovered" never reads like "selected"; an active one keeps its look.
// Multi-select (OR) — clicking toggles membership.
// Uses the `ghost` variant (not `outline`): outline bakes in `dark:border-input`,
// which would outrank `border-cat-line` in dark mode. `colors` null ("Ohne
// Kategorie") → no data-cat, so the neutral --cat-* defaults apply.
function CategoryButton({
  name,
  count,
  active,
  colors,
  onClick,
}: {
  name: string
  count: number
  active: boolean
  colors: CategoryColorInput | null
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      aria-pressed={active}
      {...(colors && categoryColorVars(colors))}
      className={`h-auto w-full justify-between gap-2 border border-cat-line px-3 py-1.5 text-sm font-normal ${
        active
          ? 'bg-cat-soft text-cat-ink hover:bg-cat-soft hover:text-cat-ink dark:hover:bg-cat-soft'
          : 'bg-transparent hover:bg-muted dark:hover:bg-muted'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-cat-dot" />
        <span className="truncate">{name}</span>
      </span>
      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{count}</span>
    </Button>
  )
}

export function CategorySidebar({
  categories,
  selected,
  onToggle,
  uncategorizedCount = 0,
}: {
  categories: UserCategory[]
  selected: number[]
  onToggle: (id: number) => void
  uncategorizedCount?: number
}) {
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return (
    // Cap the height so a long category list scrolls within its own section (like
    // Tags/Zutaten) instead of pushing the rest of the filters far down the rail.
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
      {/* "Ohne Kategorie" sits first; only offered when such recipes exist. */}
      {uncategorizedCount > 0 && (
        <CategoryButton
          name="Ohne Kategorie"
          count={uncategorizedCount}
          active={selected.includes(UNCATEGORIZED_ID)}
          colors={null}
          onClick={() => onToggle(UNCATEGORIZED_ID)}
        />
      )}
      {ordered.map((c) => (
        <CategoryButton
          key={c.id}
          name={c.name}
          count={c.recipes.length}
          active={selected.includes(c.id)}
          colors={c}
          onClick={() => onToggle(c.id)}
        />
      ))}
    </div>
  )
}
