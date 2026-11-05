import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { Checkbox, Label, cn } from '@postxl/ui-components'

// One checkbox row of a filter list (Kategorie, Tags, Zutaten). The whole row is the label, so on phones the
// tap target is the full 40-px row, not the 16-px box. Extra props land on the row, e.g. the category colour vars.
export function FilterCheckRow({
  checked,
  onToggle,
  children,
  className,
  ...rest
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'onToggle'>) {
  const id = useId()
  return (
    <div className={cn('flex items-center gap-2 rounded-sm px-1 hover:bg-muted phone:min-h-10', className)} {...rest}>
      {/* postxl renders its own (empty) label next to the box; gap-0 keeps it from adding space. */}
      <Checkbox id={id} checked={checked} onChange={onToggle} checkIcon="check" className="shrink-0 gap-0" />
      {/* Overrides postxl Label's text-base/leading-none/font-medium: rows read like today's text-sm list and
          leading-none would clip descenders of truncated names. */}
      <Label htmlFor={id} className="min-w-0 flex-1 cursor-pointer py-1 text-sm leading-snug font-normal">
        {children}
      </Label>
    </div>
  )
}

export function NoMatches() {
  return <p className="px-1 py-1 text-sm text-muted-foreground">Keine Treffer</p>
}
