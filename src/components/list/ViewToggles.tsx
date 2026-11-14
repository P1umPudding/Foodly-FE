// The two view toggles next to the sort menu on desktop — view (compact/detailed/tiles) and layout
// (by-category/flat), each its own segmented group, a gap apart.
import { cn, ToggleGroup, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import type { ListState } from '../../list/state'
import { FocusToggleGroupItem } from './FocusToggleGroupItem'
import { DETAIL_OPTIONS, LAYOUT_OPTIONS, type ViewOption } from './listOptions'

// Icon-only segmented toggle with a tooltip per option. Selection is styled via a
// JS flag (not `data-[state=on]:`): the Tooltip wrapping each item overwrites
// Radix's `data-state`, so a data-state variant would never match (same reason as
// the access toggles in filters/AccessFilter.tsx).
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
  // Segment track as in the mockup (base.css .seg): 2 px around and between the segments, radius 8 outside and 6
  // inside; the active segment is a card-coloured surface with a light shadow (flat in dark).
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={ariaLabel}
      className="gap-0.5 rounded-lg bg-seg p-0.5"
    >
      {options.map((o) => {
        const selected = value === o.value
        return (
          <Tooltip key={o.value}>
            <TooltipTrigger asChild>
              <FocusToggleGroupItem
                value={o.value}
                aria-label={o.label}
                className={cn(
                  'h-8 rounded-md px-3 text-muted-foreground hover:bg-transparent hover:text-foreground',
                  selected && 'bg-card text-foreground shadow-seg hover:bg-card',
                )}
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

export function ViewToggles({
  state,
  set,
  showLayout = true,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  showLayout?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <ViewToggle
        ariaLabel="Ansicht"
        value={state.detail}
        onChange={(v) => set({ detail: v })}
        options={DETAIL_OPTIONS}
      />
      {showLayout && (
        <ViewToggle
          ariaLabel="Gliederung"
          value={state.grouped ? 'grouped' : 'flat'}
          onChange={(v) => set({ grouped: v === 'grouped' })}
          options={LAYOUT_OPTIONS}
        />
      )}
    </div>
  )
}
