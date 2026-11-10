// The two view toggles next to the sort menu on desktop — view (compact/detailed/tiles) and layout
// (by-category/flat), each its own segmented group, a gap apart.
import { ToggleGroup, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import type { ListState } from '../../list/state'
import { FocusToggleGroupItem } from './FocusToggleGroupItem'
import { DETAIL_OPTIONS, LAYOUT_OPTIONS, type ViewOption } from './listOptions'

// Icon-only segmented toggle with a tooltip per option. Selection is styled via a
// JS flag (not `data-[state=on]:`): the Tooltip wrapping each item overwrites
// Radix's `data-state`, so a data-state variant would never match (same reason as
// the access toggles in FilterControls).
function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: ViewOption<T>[]
  ariaLabel: string
}) {
  // A visible outline turns each pair into a clear segmented unit (otherwise the
  // buttons are invisible at rest and the two groups blur together).
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={ariaLabel}
      className="rounded-md border border-border"
    >
      {options.map((o) => {
        const selected = value === o.value
        return (
          <Tooltip key={o.value}>
            <TooltipTrigger asChild>
              <FocusToggleGroupItem
                value={o.value}
                aria-label={o.label}
                className={`px-2.5 ${selected ? 'bg-foreground/10 text-foreground' : ''}`}
              >
                <o.Icon className="h-4 w-4" />
              </FocusToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>{o.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </ToggleGroup>
  )
}

export function ViewToggles({ state, set }: { state: ListState; set: (patch: Partial<ListState>) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <ViewToggle
        ariaLabel="Ansicht"
        value={state.detail}
        onChange={(v) => set({ detail: v })}
        options={DETAIL_OPTIONS}
      />
      <ViewToggle
        ariaLabel="Gliederung"
        value={state.grouped ? 'grouped' : 'flat'}
        onChange={(v) => set({ grouped: v === 'grouped' })}
        options={LAYOUT_OPTIONS}
      />
    </div>
  )
}
