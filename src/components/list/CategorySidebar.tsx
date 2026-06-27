import { Button } from '@postxl/ui-components'
import { colorClasses } from '../../list/palette'
import type { UserCategory } from '../../api/protocol'

// Full-width stacked toggles: inactive = category-colour outline; active = filled
// with the colour at a low alpha. Hovering keeps the category tint (stronger when
// active, faint when not) so a button always gives click feedback without losing
// its selected look. Multi-select (OR) — clicking toggles membership.
// Uses the `ghost` variant (not `outline`): outline bakes in `dark:border-input`
// which outranks our `border-[hex]` in dark mode, hiding the colour. ghost has no
// border of its own, so our `border ${cc.border}` is the only rule → shows in both modes.
export function CategorySidebar({
  categories,
  selected,
  onToggle,
}: {
  categories: UserCategory[]
  selected: number[]
  onToggle: (id: number) => void
}) {
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return (
    <div className="flex flex-col gap-2">
      {ordered.map((c) => {
        const cc = colorClasses(c.color)
        const active = selected.includes(c.id)
        return (
          <Button
            key={c.id}
            type="button"
            variant="ghost"
            onClick={() => onToggle(c.id)}
            aria-pressed={active}
            className={`h-auto w-full justify-between gap-2 border px-3 py-1.5 text-sm font-normal ${cc.border} ${
              active ? `${cc.bgActive} ${cc.bgActiveHover} ${cc.text}` : `bg-transparent ${cc.bgHover}`
            }`}
          >
            <span className="min-w-0 truncate">{c.name}</span>
            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{c.recipes.length}</span>
          </Button>
        )
      })}
    </div>
  )
}
