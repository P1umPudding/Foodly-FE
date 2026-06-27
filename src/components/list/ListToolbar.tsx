// Toolbar next to the search bar: sort dropdown (icon + label) + detail-density toggle.
import { type ReactNode } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, ToggleGroup, ToggleGroupItem } from '@postxl/ui-components'
import {
  ArrowDownAZ,
  ArrowDownZA,
  Clock,
  Timer,
  Star,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Rows3,
  Rows4,
} from 'lucide-react'
import type { ListState, SortKey, SortDir, DetailView } from '../../list/state'

const Up = ArrowUpNarrowWide
const Down = ArrowDownWideNarrow

// value = `${sortKey}|${sortDir}`; node = the icon(s) shown in trigger + item.
// `label` is the full menu wording; `short` is the compact trigger wording (the
// direction is already carried by the icon there).
const SORT_OPTIONS: { value: string; label: string; short: string; node: ReactNode }[] = [
  { value: 'name|asc', label: 'Name A–Z', short: 'Name A–Z', node: <ArrowDownAZ className="h-4 w-4" /> },
  { value: 'name|desc', label: 'Name Z–A', short: 'Name Z–A', node: <ArrowDownZA className="h-4 w-4" /> },
  {
    value: 'work|asc',
    label: 'Arbeitszeit kurz zuerst',
    short: 'Arbeitszeit',
    node: (
      <span className="flex items-center gap-0.5">
        <Clock className="h-4 w-4" />
        <Up className="h-3.5 w-3.5" />
      </span>
    ),
  },
  {
    value: 'work|desc',
    label: 'Arbeitszeit lang zuerst',
    short: 'Arbeitszeit',
    node: (
      <span className="flex items-center gap-0.5">
        <Clock className="h-4 w-4" />
        <Down className="h-3.5 w-3.5" />
      </span>
    ),
  },
  {
    value: 'overall|asc',
    label: 'Gesamtzeit kurz zuerst',
    short: 'Gesamtzeit',
    node: (
      <span className="flex items-center gap-0.5">
        <Timer className="h-4 w-4" />
        <Up className="h-3.5 w-3.5" />
      </span>
    ),
  },
  {
    value: 'overall|desc',
    label: 'Gesamtzeit lang zuerst',
    short: 'Gesamtzeit',
    node: (
      <span className="flex items-center gap-0.5">
        <Timer className="h-4 w-4" />
        <Down className="h-3.5 w-3.5" />
      </span>
    ),
  },
  {
    value: 'rating|desc',
    label: 'Bewertung beste zuerst',
    short: 'Bewertung',
    node: (
      <span className="flex items-center gap-0.5">
        <Star className="h-4 w-4" />
        <Down className="h-3.5 w-3.5" />
      </span>
    ),
  },
  {
    value: 'rating|asc',
    label: 'Bewertung schlechteste zuerst',
    short: 'Bewertung',
    node: (
      <span className="flex items-center gap-0.5">
        <Star className="h-4 w-4" />
        <Up className="h-3.5 w-3.5" />
      </span>
    ),
  },
]

export function ListToolbar({ state, set }: { state: ListState; set: (patch: Partial<ListState>) => void }) {
  const current = `${state.sortKey}|${state.sortDir}`
  const currentOption = SORT_OPTIONS.find((o) => o.value === current)
  return (
    <div className="flex items-center gap-3">
      <Select
        value={current}
        onValueChange={(v) => {
          const [key, dir] = v.split('|') as [SortKey, SortDir]
          set({ sortKey: key, sortDir: dir })
        }}
      >
        <SelectTrigger aria-label="Sortierung" className="w-auto gap-2 px-3">
          {currentOption && (
            <span className="flex items-center gap-1.5">
              {currentOption.node}
              <span className="hidden text-sm sm:inline">{currentOption.short}</span>
            </span>
          )}
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            // textValue powers Radix typeahead + the accessible name.
            <SelectItem key={o.value} value={o.value} textValue={o.label}>
              <span className="flex items-center gap-2">
                {o.node}
                <span className="text-sm">{o.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToggleGroup type="single" value={state.detail} onValueChange={(v) => v && set({ detail: v as DetailView })}>
        <ToggleGroupItem
          value="detailed"
          aria-label="Detailliert"
          className="gap-1.5 px-2.5 data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
        >
          <Rows3 className="h-4 w-4" />
          {state.detail === 'detailed' && <span className="text-sm">Detailliert</span>}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="compact"
          aria-label="Kompakt"
          className="gap-1.5 px-2.5 data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
        >
          <Rows4 className="h-4 w-4" />
          {state.detail === 'compact' && <span className="text-sm">Kompakt</span>}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
