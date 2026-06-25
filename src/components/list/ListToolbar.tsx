// Toolbar next to the "Rezepte" heading: icon-only sort dropdown + detail toggle.
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
const SORT_OPTIONS: { value: string; label: string; node: ReactNode }[] = [
  { value: 'name|asc', label: 'Name A–Z', node: <ArrowDownAZ className="h-4 w-4" /> },
  { value: 'name|desc', label: 'Name Z–A', node: <ArrowDownZA className="h-4 w-4" /> },
  {
    value: 'work|asc',
    label: 'Arbeitszeit kurz zuerst',
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
  const currentNode = SORT_OPTIONS.find((o) => o.value === current)?.node
  return (
    <div className="flex items-center gap-3">
      <Select
        value={current}
        onValueChange={(v) => {
          const [key, dir] = v.split('|') as [SortKey, SortDir]
          set({ sortKey: key, sortDir: dir })
        }}
      >
        <SelectTrigger aria-label="Sortierung" className="w-auto gap-1 px-3">
          {currentNode}
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            // textValue is required by Radix Select for non-text item content
            // (icon-only) — it powers typeahead + the accessible name.
            <SelectItem key={o.value} value={o.value} textValue={o.label} aria-label={o.label}>
              {o.node}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToggleGroup type="single" value={state.detail} onValueChange={(v) => v && set({ detail: v as DetailView })}>
        <ToggleGroupItem
          value="detailed"
          aria-label="Detailliert"
          className="gap-1.5 px-2.5 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
        >
          <Rows3 className="h-4 w-4" />
          {state.detail === 'detailed' && <span className="text-sm">Detailliert</span>}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="compact"
          aria-label="Kompakt"
          className="gap-1.5 px-2.5 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
        >
          <Rows4 className="h-4 w-4" />
          {state.detail === 'compact' && <span className="text-sm">Kompakt</span>}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
