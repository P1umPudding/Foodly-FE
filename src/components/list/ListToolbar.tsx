// Toolbar next to the search bar: a sort control (direction toggle + criterion
// picker) and two view toggles — density (detailed/compact) and layout
// (by-category/flat). The two toggles are separate segmented groups, spaced apart
// from the sort control so it reads as "sort … | view".
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@postxl/ui-components'
import {
  Type,
  Clock,
  Timer,
  Star,
  ArrowUpAZ,
  ArrowDownZA,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  LayoutList,
  Menu,
  ListTree,
  List,
  type LucideIcon,
} from 'lucide-react'
import type { ListState, SortKey, SortDir, DetailView } from '../../list/state'

type Criterion = { key: SortKey; label: string; Icon: LucideIcon }
const SORT_CRITERIA: Criterion[] = [
  { key: 'name', label: 'Name', Icon: Type },
  { key: 'work', label: 'Arbeitszeit', Icon: Clock },
  { key: 'overall', label: 'Gesamtzeit', Icon: Timer },
  { key: 'rating', label: 'Bewertung', Icon: Star },
]

// Direction glyph: the ARROW flips up (ascending) / down (descending). For name the
// letters also swap (A→Z up vs Z→A down); for the numeric keys the bars go narrow→wide.
function dirIcon(sortKey: SortKey, dir: SortDir): LucideIcon {
  if (sortKey === 'name') return dir === 'asc' ? ArrowUpAZ : ArrowDownZA
  return dir === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow
}

// Plain-language meaning of the current direction, per criterion (toggle tooltip).
function dirLabel(sortKey: SortKey, dir: SortDir): string {
  if (sortKey === 'name') return dir === 'asc' ? 'A → Z' : 'Z → A'
  if (sortKey === 'rating') return dir === 'asc' ? 'Schlechteste zuerst' : 'Beste zuerst'
  return dir === 'asc' ? 'Kürzeste zuerst' : 'Längste zuerst'
}

type ViewOption<T extends string> = { value: T; label: string; Icon: LucideIcon }

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
              <ToggleGroupItem
                value={o.value}
                aria-label={o.label}
                className={`px-2.5 ${selected ? 'bg-foreground/10 text-foreground' : ''}`}
              >
                <o.Icon className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>{o.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </ToggleGroup>
  )
}

export function ListToolbar({ state, set }: { state: ListState; set: (patch: Partial<ListState>) => void }) {
  const criterion = SORT_CRITERIA.find((c) => c.key === state.sortKey) ?? SORT_CRITERIA[0]
  const DirIcon = dirIcon(state.sortKey, state.sortDir)
  const toggleDir = () => set({ sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' })

  return (
    <div className="flex items-center gap-4">
      {/* Sort: direction toggle, then the criterion picker behind it. */}
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Sortierrichtung umschalten – ${dirLabel(state.sortKey, state.sortDir)}`}
              onClick={toggleDir}
            >
              <DirIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{dirLabel(state.sortKey, state.sortDir)}</TooltipContent>
        </Tooltip>

        <Select value={state.sortKey} onValueChange={(v) => set({ sortKey: v as SortKey })}>
          {/* Width = the widest criterion (invisible sizers reserve it), so the
              trigger never resizes per selection but also carries no slack. Icon trails the label. */}
          <SelectTrigger aria-label="Sortierkriterium" className="w-auto gap-2 px-3">
            <span className="grid">
              {SORT_CRITERIA.map((c) => (
                <span key={c.key} aria-hidden className="invisible col-start-1 row-start-1 flex items-center gap-1.5">
                  <span className="hidden text-sm sm:inline">{c.label}</span>
                  <c.Icon className="h-4 w-4" />
                </span>
              ))}
              <span className="col-start-1 row-start-1 flex items-center gap-1.5">
                <span className="hidden text-sm sm:inline">{criterion.label}</span>
                <criterion.Icon className="h-4 w-4" />
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>
            {SORT_CRITERIA.map((c) => (
              // label first, criterion icon trailing.
              <SelectItem key={c.key} value={c.key} textValue={c.label}>
                <span className="flex items-center gap-2">
                  <span className="text-sm">{c.label}</span>
                  <c.Icon className="h-4 w-4 text-muted-foreground" />
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* View: density + layout, each its own segmented group, a gap apart. */}
      <div className="flex items-center gap-2.5">
        <ViewToggle
          ariaLabel="Dichte"
          value={state.detail}
          onChange={(v: DetailView) => set({ detail: v })}
          options={[
            { value: 'detailed', label: 'Detailliert', Icon: LayoutList },
            { value: 'compact', label: 'Kompakt', Icon: Menu },
          ]}
        />
        <ViewToggle
          ariaLabel="Gliederung"
          value={state.grouped ? 'grouped' : 'flat'}
          onChange={(v) => set({ grouped: v === 'grouped' })}
          options={[
            { value: 'grouped', label: 'Nach Kategorie', Icon: ListTree },
            { value: 'flat', label: 'Einfache Liste', Icon: List },
          ]}
        />
      </div>
    </div>
  )
}
