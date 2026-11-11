// Desktop sort control: one button ("↑ Name ▾") opening a menu with the criterion and the direction, the
// direction worded per criterion.
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@postxl/ui-components'
import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ListState, SortDir, SortKey } from '../../list/state'
import { TriggerButton } from '../TriggerButton'
import { SORT_CRITERIA, SORT_DIRS, criterionFor, dirIcon, dirLabel } from './listOptions'

export function SortMenu({ state, set }: { state: ListState; set: (patch: Partial<ListState>) => void }) {
  const criterion = criterionFor(state.sortKey)
  const DirIcon = dirIcon(state.sortKey, state.sortDir)
  const keyLabelId = useId()
  const dirLabelId = useId()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TriggerButton
          variant="outline"
          size="sm"
          aria-label={`Sortieren: ${criterion.label}, ${dirLabel(state.sortKey, state.sortDir)}`}
        >
          <DirIcon aria-hidden />
          {/* Width = the widest criterion (invisible sizers reserve it), so the button never resizes per
              selection and the search field next to it doesn't jump. */}
          <span className="grid">
            {SORT_CRITERIA.map((c) => (
              <span key={c.key} aria-hidden className="invisible col-start-1 row-start-1">
                {c.label}
              </span>
            ))}
            <span className="col-start-1 row-start-1 text-left">{criterion.label}</span>
          </span>
          <ChevronDown aria-hidden />
        </TriggerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel id={keyLabelId}>Sortieren nach</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-labelledby={keyLabelId}
          value={state.sortKey}
          onValueChange={(v) => set({ sortKey: v as SortKey })}
        >
          {SORT_CRITERIA.map((c) => (
            <DropdownMenuRadioItem key={c.key} value={c.key}>
              {c.label}
              <c.Icon aria-hidden className="ml-auto text-muted-foreground" />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel id={dirLabelId}>Richtung</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-labelledby={dirLabelId}
          value={state.sortDir}
          onValueChange={(v) => set({ sortDir: v as SortDir })}
        >
          {SORT_DIRS.map((dir) => (
            <DropdownMenuRadioItem key={dir} value={dir}>
              {dirLabel(state.sortKey, dir)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
