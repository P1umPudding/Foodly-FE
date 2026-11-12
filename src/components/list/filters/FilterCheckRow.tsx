import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { Checkbox, Label, cn } from '@postxl/ui-components'

// One checkbox row of a filter list (Kategorie, Tags, Zutaten). The whole row is the label, so on phones the
// tap target is the full 40-px row, not the 16-px box. Extra props land on the row, e.g. the category colour vars.
// `busy` (a save in flight) blocks toggling via aria-disabled rather than `disabled`: disabling the focused box would
// drop keyboard focus to <body>.
export function FilterCheckRow({
  checked,
  onToggle,
  busy = false,
  children,
  className,
  ...rest
}: {
  checked: boolean
  onToggle: () => void
  busy?: boolean
  children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'onToggle'>) {
  const id = useId()
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-1 phone:min-h-10',
        busy ? 'cursor-wait opacity-60' : 'hover:bg-muted',
        className,
      )}
      {...rest}
    >
      {/* postxl renders its own (empty) label next to the box; gap-0 keeps it from adding space. */}
      <Checkbox
        id={id}
        checked={checked}
        onChange={busy ? () => {} : onToggle}
        aria-disabled={busy || undefined}
        checkIcon="check"
        className="shrink-0 gap-0"
      />
      {/* Overrides postxl Label's text-base/leading-none/font-medium: rows read like today's text-sm list and
          leading-none would clip descenders of truncated names. */}
      <Label
        htmlFor={id}
        className={cn(
          'min-w-0 flex-1 self-stretch py-1 text-sm leading-snug font-normal',
          busy ? 'cursor-wait' : 'cursor-pointer',
        )}
      >
        {children}
      </Label>
    </div>
  )
}

export function NoMatches({ children = 'Keine Treffer' }: { children?: ReactNode }) {
  return <p className="px-1 py-1 text-sm text-muted-foreground">{children}</p>
}
