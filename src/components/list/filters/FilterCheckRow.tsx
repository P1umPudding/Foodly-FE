import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { Checkbox, Label, cn } from '@postxl/ui-components'

// One checkbox row of a filter list (Kategorie, Tags, Zutaten). The whole row is the label, so on phones the
// tap target is the full 40-px row, not the 16-px box. Extra props land on the row, e.g. the category colour vars.
// `busy` (a save in flight) blocks toggling via aria-disabled rather than `disabled`: disabling the focused box would
// drop keyboard focus to <body>.
// look="filter": the filter popovers' mockup row (screens.css .ck): 32/40 px, muted text, the checked row fg/500, a
// filled fg box. The editor's category panel keeps the plain row.
export function FilterCheckRow({
  checked,
  onToggle,
  busy = false,
  look = 'plain',
  children,
  className,
  ...rest
}: {
  checked: boolean
  onToggle: () => void
  busy?: boolean
  look?: 'plain' | 'filter'
  children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'onToggle'>) {
  const id = useId()
  const filter = look === 'filter'
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-1 phone:min-h-10',
        filter && 'min-h-8 shrink-0 gap-[9px] px-2',
        busy ? 'cursor-wait opacity-60' : filter ? 'hover:bg-hover' : 'hover:bg-muted',
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
        iconStyle={filter ? 'simple' : undefined}
        className={cn(
          'shrink-0 gap-0',
          filter &&
            '[&>input]:border-[1.5px] [&>input]:border-border-strong [&>input]:shadow-none [&>input]:checked:border-foreground [&>input]:checked:bg-foreground [&_svg]:size-3',
        )}
      />
      {/* Overrides postxl Label's text-base/leading-none/font-medium: rows read like today's text-sm list and
          leading-none would clip descenders of truncated names. */}
      <Label
        htmlFor={id}
        className={cn(
          'min-w-0 flex-1 self-stretch py-1 text-sm leading-snug font-normal',
          filter && 'phone:text-lg',
          filter && (checked ? 'font-medium text-foreground' : 'text-muted-foreground'),
          busy ? 'cursor-wait' : 'cursor-pointer',
        )}
      >
        {children}
      </Label>
    </div>
  )
}

export function NoMatches({ children = 'Keine Treffer' }: { children?: ReactNode }) {
  return <p className="px-2 py-1 text-sm text-muted-foreground">{children}</p>
}

// The mockup's .fp-hint under a filter's options. Muted, not the mockup's subtle: subtle is no AA for small text
// (docs/design.md §2).
export function FilterHint({ children }: { children: ReactNode }) {
  return <p className="mx-2 mt-1.5 text-xs text-muted-foreground">{children}</p>
}

// The mockup's .fp-hint under a filter's options. Muted, not the mockup's subtle: subtle is no AA for small text
// (docs/design.md §2).
export function FilterHint({ children }: { children: ReactNode }) {
  return <p className="mx-2 mt-1.5 text-xs text-muted-foreground">{children}</p>
}
