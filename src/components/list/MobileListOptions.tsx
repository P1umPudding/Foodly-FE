// Phone counterpart of the sort menu and view toggles: one 40 px button next to the search opens a bottom sheet
// "Sortieren & Ansicht" laid out as in the mockup — the criteria as a menu list with the direction as a segment,
// then view and layout as segments with text. Choices apply as they are made, so the sheet has no "Anzeigen" button.
import { useId, type ReactNode } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { cn, Sheet, SheetTrigger, ToggleGroup } from '@postxl/ui-components'
import { sortPatchForKey } from '../../list/sort'
import type { ListState, SortKey } from '../../list/state'
import { BottomSheet } from '../BottomSheet'
import { TriggerButton } from '../TriggerButton'
import { FocusToggleGroupItem } from './FocusToggleGroupItem'
import { DETAIL_OPTIONS, LAYOUT_OPTIONS, SORT_CRITERIA, SORT_DIRS, dirLabel } from './listOptions'
import { Segment } from './Segment'

const TITLE = 'Sortieren & Ansicht'

// 36 px segments make a 40 px track: the phone's tap-target height (docs/design.md §7) instead of the mockup's 32.
const SHEET_SEG_ITEM = 'h-9'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section>
      <h3 id={id} className="mb-2 text-xs font-semibold text-subtle-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

// The criteria as the desktop menu draws them (icon left, ✓ right on the current one), 40 px rows for touch.
function CriterionList({
  value,
  onPick,
  'aria-labelledby': labelledBy,
}: {
  value: SortKey
  onPick: (key: SortKey) => void
  'aria-labelledby': string
}) {
  return (
    <ToggleGroup
      type="single"
      orientation="vertical"
      value={value}
      // Tapping the current criterion yields '' — still a pick, which resets its direction like on desktop.
      onValueChange={(v) => onPick((v || value) as SortKey)}
      aria-labelledby={labelledBy}
      className="flex-col items-stretch gap-0"
    >
      {SORT_CRITERIA.map((c) => {
        const selected = c.key === value
        return (
          <FocusToggleGroupItem
            key={c.key}
            value={c.key}
            className={cn(
              'h-10 justify-start gap-2.5 px-2.5 text-base font-normal text-muted-foreground hover:bg-hover hover:text-muted-foreground data-[state=on]:bg-transparent',
              selected &&
                'font-medium text-foreground hover:text-foreground data-[state=on]:text-foreground data-[state=on]:hover:bg-hover',
            )}
          >
            <c.Icon aria-hidden className="size-4" />
            <span className="flex-1 text-left">{c.label}</span>
            {selected && <Check aria-hidden data-testid="sort-check" className="size-4" />}
          </FocusToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

export function MobileListOptions({
  state,
  set,
  showLayout = true,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  showLayout?: boolean
}) {
  const ids = useId()
  const sortHeading = `${ids}-sort`
  const viewHeading = `${ids}-view`
  const layoutHeading = `${ids}-layout`
  const dirOptions = SORT_DIRS.map((dir) => ({ value: dir, label: dirLabel(state.sortKey, dir) }))

  return (
    <Sheet>
      <SheetTrigger asChild>
        <TriggerButton variant="outline" size="icon" aria-label="Sortieren und Ansicht" className="size-10 shrink-0">
          <SlidersHorizontal aria-hidden />
        </TriggerButton>
      </SheetTrigger>
      <BottomSheet title={TITLE} description="Sortierung und Ansicht einstellen">
        <div className="space-y-5">
          <Section id={sortHeading} title="Sortieren nach">
            <CriterionList
              aria-labelledby={sortHeading}
              value={state.sortKey}
              onPick={(key) => set(sortPatchForKey(key))}
            />
            <div aria-hidden className="my-1.5 h-px bg-divider" />
            <Segment
              aria-label="Richtung"
              full
              withLabels
              value={state.sortDir}
              onChange={(sortDir) => set({ sortDir })}
              options={dirOptions}
              itemClassName={SHEET_SEG_ITEM}
            />
          </Section>
          <Section id={viewHeading} title="Ansicht">
            <Segment
              aria-labelledby={viewHeading}
              full
              withLabels
              value={state.detail}
              onChange={(detail) => set({ detail })}
              options={DETAIL_OPTIONS}
              itemClassName={SHEET_SEG_ITEM}
            />
          </Section>
          {showLayout && (
            <Section id={layoutHeading} title="Gliederung">
              <Segment
                aria-labelledby={layoutHeading}
                full
                withLabels
                value={state.grouped ? 'grouped' : 'flat'}
                onChange={(v) => set({ grouped: v === 'grouped' })}
                options={LAYOUT_OPTIONS}
                itemClassName={SHEET_SEG_ITEM}
              />
            </Section>
          )}
        </div>
      </BottomSheet>
    </Sheet>
  )
}
