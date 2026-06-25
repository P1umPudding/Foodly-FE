import { Button, Checkbox } from '@postxl/ui-components'
import type { UserCategory } from '../../api/protocol'

// Known mock palette → literal Tailwind classes (the v4 scanner only keeps literal
// strings, so a dynamic `bg-[${hex}]` would not be generated). Unknown colours fall
// back to a neutral dot. When the real backend supplies arbitrary category colours,
// switch this to CSS-variable tokens (theme.css → styles.css bridge).
const SWATCH: Record<string, string> = {
  '#e11d48': 'bg-[#e11d48]',
  '#0ea5e9': 'bg-[#0ea5e9]',
  '#f59e0b': 'bg-[#f59e0b]',
  '#10b981': 'bg-[#10b981]',
}

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
    <nav className="flex flex-col gap-1">
      {ordered.map((c) => (
        <Button
          key={c.id}
          type="button"
          variant="ghost"
          onClick={() => onToggle(c.id)}
          className="h-auto w-full justify-start gap-2 px-2 py-1.5 font-normal"
        >
          <Checkbox checked={selected.includes(c.id)} readOnly className="pointer-events-none" />
          <span className={`h-3 w-3 shrink-0 rounded-full ${SWATCH[c.color] ?? 'bg-muted'}`} />
          <span className="min-w-0 flex-1 truncate text-left">{c.name}</span>
          <span className="tabular-nums text-xs text-muted-foreground">{c.recipes.length}</span>
        </Button>
      ))}
    </nav>
  )
}
