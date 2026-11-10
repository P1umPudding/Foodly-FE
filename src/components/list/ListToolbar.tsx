// Toolbar next to the search bar: a sort control (direction toggle + criterion
// picker) and the view toggles, spaced apart so it reads as "sort … | view".
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@postxl/ui-components'
import type { ListState, SortKey } from '../../list/state'
import { ViewToggles } from './ViewToggles'
import { SORT_CRITERIA, criterionFor, dirIcon, dirLabel } from './listOptions'

export function ListToolbar({ state, set }: { state: ListState; set: (patch: Partial<ListState>) => void }) {
  const criterion = criterionFor(state.sortKey)
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

      <ViewToggles state={state} set={set} />
    </div>
  )
}
