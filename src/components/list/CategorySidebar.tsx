import { Button } from '@postxl/ui-components'
import { colorClasses } from '../../list/palette'
import type { UserCategory } from '../../api/protocol'

// Toggle buttons: inactive = category-colour outline; active = filled with the
// colour at a low alpha. Multi-select (OR) — clicking toggles membership.
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
    <div className="flex flex-wrap gap-2">
      {ordered.map((c) => {
        const cc = colorClasses(c.color)
        const active = selected.includes(c.id)
        return (
          <Button
            key={c.id}
            type="button"
            variant="outline"
            onClick={() => onToggle(c.id)}
            aria-pressed={active}
            className={`h-auto gap-2 border px-3 py-1.5 text-sm font-normal ${cc.border} ${
              active ? `${cc.bgActive} ${cc.text}` : 'bg-transparent'
            }`}
          >
            <span className="truncate">{c.name}</span>
            <span className="tabular-nums text-xs text-muted-foreground">{c.recipes.length}</span>
          </Button>
        )
      })}
    </div>
  )
}
