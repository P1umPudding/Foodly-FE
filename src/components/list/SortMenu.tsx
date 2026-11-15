// Desktop sort control: one button ("⇅ Name ▾") opening a menu list of the criteria with the direction as a
// segment below, as in the mockup. The menu stays open on a pick (mockup too), so the direction can follow without
// reopening; Esc or a click outside closes it.
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@postxl/ui-components'
import { Check, ChevronDown } from 'lucide-react'
import { sortPatchForKey } from '../../list/sort'
import type { ListState, SortDir, SortKey } from '../../list/state'
import { TriggerButton } from '../TriggerButton'
import { SORT_CRITERIA, SORT_DIRS, criterionFor, dirIcon, dirLabel } from './listOptions'
import { SEG_ITEM, SEG_ITEM_ON, SEG_TRACK } from './Segment'

const keepOpen = (e: Event) => e.preventDefault()

// postxl's radio item reserves pl-8 for its dot indicator (absolute, first child); the menu list shows a ✓ on the
// right instead, so the dot goes and the indent with it.
const NO_DOT = 'pl-2.5 [&>span:first-child]:hidden'

export function SortMenu({ state, set }: { state: ListState; set: (patch: Partial<ListState>) => void }) {
  const criterion = criterionFor(state.sortKey)
  const DirIcon = dirIcon(state.sortKey, state.sortDir)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* sm already has the mockup button's 6 px gap and 10 px padding; only the toolbar height (38 px) and the
            14 px text differ. */}
        <TriggerButton
          variant="outline"
          size="sm"
          className="h-[38px] text-base"
          aria-label={`Sortieren: ${criterion.label}, ${dirLabel(state.sortKey, state.sortDir)}`}
        >
          <DirIcon aria-hidden />
          {criterion.label}
          <ChevronDown aria-hidden className="text-subtle-foreground" />
        </TriggerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-lg p-1.5">
        {/* Radix calls onValueChange on every pick, the current criterion included, so re-picking it resets the
            direction too (as in the mockup). */}
        <DropdownMenuRadioGroup
          aria-label="Sortieren nach"
          value={state.sortKey}
          onValueChange={(v) => set(sortPatchForKey(v as SortKey))}
        >
          {SORT_CRITERIA.map((c) => {
            const selected = c.key === state.sortKey
            return (
              <DropdownMenuRadioItem
                key={c.key}
                value={c.key}
                onSelect={keepOpen}
                className={cn(
                  NO_DOT,
                  'h-[34px] gap-2.5 rounded-md pr-2.5 text-base text-muted-foreground focus:bg-hover focus:text-muted-foreground',
                  selected && 'font-medium text-foreground focus:text-foreground',
                )}
              >
                <c.Icon aria-hidden />
                <span className="flex-1">{c.label}</span>
                {selected && <Check aria-hidden data-testid="sort-check" />}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className="mx-0 my-1.5 bg-divider" />
        {/* The direction as a segment, but built from menu items: Radix menus trap Tab, so only items are reachable
            by keyboard (↑/↓ walk on from the criteria). */}
        <DropdownMenuRadioGroup
          aria-label="Richtung"
          value={state.sortDir}
          onValueChange={(v) => set({ sortDir: v as SortDir })}
          className={cn(SEG_TRACK, 'flex')}
        >
          {SORT_DIRS.map((dir) => {
            const selected = dir === state.sortDir
            return (
              <DropdownMenuRadioItem
                key={dir}
                value={dir}
                onSelect={keepOpen}
                className={cn(
                  NO_DOT,
                  SEG_ITEM,
                  'h-8 flex-1 justify-center px-1.5 py-0 focus:bg-hover focus:text-foreground',
                  selected && cn(SEG_ITEM_ON, 'focus:bg-card'),
                )}
              >
                {dirLabel(state.sortKey, dir)}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
