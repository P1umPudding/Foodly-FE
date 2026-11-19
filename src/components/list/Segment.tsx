// Segmented single-choice control in the mockup's track look (base.css .seg): 2 px around and between the
// segments, radius 8 outside and 6 inside; the active segment is a card-coloured surface with a light shadow (flat
// in dark). Used for the desktop view toggles and the phone sheet; the sort menu's direction reuses the classes.
import { cn, ToggleGroup, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { FocusToggleGroupItem } from './FocusToggleGroupItem'
import type { LucideIcon } from 'lucide-react'
import type { MouseEvent } from 'react'

export const SEG_TRACK = 'gap-0.5 rounded-lg bg-seg p-0.5'
export const SEG_ITEM = 'rounded-md px-3 text-sm font-medium text-muted-foreground'
export const SEG_ITEM_ON = 'bg-card text-foreground shadow-seg'

export function Segment<T extends string>({
  value,
  onChange,
  options,
  withLabels = false,
  full = false,
  itemClassName,
  onItemClick,
  ...labelling
}: {
  value: T
  onChange: (v: T) => void
  // Without an icon the segment shows its text only (the sort direction).
  options: { value: T; label: string; Icon?: LucideIcon }[]
  // Icon + text; without it the segments are icon-only with a tooltip.
  withLabels?: boolean
  // Spread over the full width, segments equally wide (mockup .seg.full).
  full?: boolean
  // Segment height differs per place (34 px in the desktop toolbar, 40 px in the phone sheet).
  itemClassName?: string
  // Runs before the selection change; the theme switch needs the click point for its reveal.
  onItemClick?: (v: T, e: MouseEvent<HTMLElement>) => void
} & ({ 'aria-label': string } | { 'aria-labelledby': string })) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className={cn(SEG_TRACK, full && 'w-full')}
      {...labelling}
    >
      {options.map((o) => {
        // Selection is styled via a JS flag as well as data-state: a wrapping Tooltip overwrites Radix's
        // `data-state`, while without one postxl's `data-[state=on]:bg-accent` would win over a plain bg-card.
        const selected = value === o.value
        const item = (
          <FocusToggleGroupItem
            key={o.value}
            value={o.value}
            aria-label={withLabels ? undefined : o.label}
            onClick={onItemClick && ((e) => onItemClick(o.value, e))}
            className={cn(
              SEG_ITEM,
              'hover:bg-transparent hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground',
              full && 'flex-1 gap-1.5 px-1.5',
              selected && cn(SEG_ITEM_ON, 'hover:bg-card'),
              itemClassName,
            )}
          >
            {o.Icon && <o.Icon aria-hidden className="size-4" />}
            {withLabels && o.label}
          </FocusToggleGroupItem>
        )
        if (withLabels) return item
        return (
          <Tooltip key={o.value}>
            <TooltipTrigger asChild>{item}</TooltipTrigger>
            <TooltipContent>{o.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </ToggleGroup>
  )
}
