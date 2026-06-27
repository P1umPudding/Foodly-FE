import { Button } from '@postxl/ui-components'
import { colorClasses } from '../../list/palette'
import { UNCATEGORIZED_ID } from '../../list/filter'
import type { UserCategory } from '../../api/protocol'

// Full-width stacked toggles: inactive = category-colour outline; active = filled
// with the colour at a low alpha. Hovering keeps the category tint (stronger when
// active, faint when not) so a button always gives click feedback without losing
// its selected look. Multi-select (OR) — clicking toggles membership.
// Uses the `ghost` variant (not `outline`): outline bakes in `dark:border-input`
// which outranks our `border-[hex]` in dark mode, hiding the colour. ghost has no
// border of its own, so our `border ${cc.border}` is the only rule → shows in both modes.
// One full-width toggle. `cc` carries the category colour (neutral for the
// "Ohne Kategorie" pseudo-entry).
function CategoryButton({
  name,
  count,
  active,
  cc,
  onClick,
}: {
  name: string
  count: number
  active: boolean
  cc: ReturnType<typeof colorClasses>
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      aria-pressed={active}
      className={`h-auto w-full justify-between gap-2 border px-3 py-1.5 text-sm font-normal ${cc.border} ${
        active ? `${cc.bgActive} ${cc.bgActiveHover} ${cc.text}` : `bg-transparent ${cc.bgHover}`
      }`}
    >
      <span className="min-w-0 truncate">{name}</span>
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
          cc={colorClasses('')}
          onClick={() => onToggle(UNCATEGORIZED_ID)}
        />
      )}
      {ordered.map((c) => (
        <CategoryButton
          key={c.id}
          name={c.name}
          count={c.recipes.length}
          active={selected.includes(c.id)}
          cc={colorClasses(c.color)}
          onClick={() => onToggle(c.id)}
        />
      ))}
    </div>
  )
}
