import { Button } from '@postxl/ui-components'
import { categoryColorVars, type CategoryColorInput } from '../../lib/categoryColor'
import { UNCATEGORIZED_ID } from '../../list/filter'
import type { UserCategory } from '../../api/protocol'

// Hovering an inactive toggle stays neutral so "hovered" never reads like "selected".
// The soft fill alone is ~1.1:1 against the background in light mode, so the active
// state also gets the dot-coloured border (≥ 3:1, WCAG 1.4.11) and medium weight.
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
      className={`h-auto w-full justify-between gap-2 border px-3 py-1.5 text-sm ${
        active
          ? 'border-cat-dot bg-cat-soft font-medium text-cat-ink hover:bg-cat-soft hover:text-cat-ink dark:hover:bg-cat-soft'
          : 'border-cat-line bg-transparent font-normal hover:bg-muted dark:hover:bg-muted'
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
