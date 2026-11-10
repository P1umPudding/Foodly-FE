// Phone counterpart of the sort menu and view toggles: one 40 px button next to the search opens a bottom
// sheet with sort criterion, direction, view and layout. Choices apply as they are made, so the sheet has no
// "Anzeigen" button.
import { useId, type ReactNode } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Label, RadioGroup, RadioGroupItem, Sheet, SheetTrigger, buttonVariants, cn } from '@postxl/ui-components'
import type { ListState } from '../../list/state'
import { BottomSheet } from '../BottomSheet'
import {
  DETAIL_OPTIONS,
  LAYOUT_OPTIONS,
  SORT_CRITERIA,
  SORT_DIRS,
  dirIcon,
  dirLabel,
  type ViewOption,
} from './listOptions'

const TITLE = 'Sortieren & Ansicht'

// Rows like AccessFilter's: the label spans the row, so the whole 40 px row is the tap target.
function OptionRadioGroup<T extends string>({
  value,
  onChange,
  options,
  ...labelling
}: {
  value: T
  onChange: (v: T) => void
  options: ViewOption<T>[]
} & ({ 'aria-label': string } | { 'aria-labelledby': string })) {
  const baseId = useId()
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as T)} className="gap-0.5" {...labelling}>
      {options.map((o) => {
        const id = `${baseId}-${o.value}`
        return (
          <div key={o.value} className="flex min-h-10 items-center gap-2 rounded-sm px-1 hover:bg-muted">
            <RadioGroupItem value={o.value} id={id} />
            {/* Overrides postxl Label's text-base/leading-none/font-medium, like FilterCheckRow. */}
            <Label
              htmlFor={id}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch py-1 text-sm leading-snug font-normal"
            >
              <o.Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{o.label}</span>
            </Label>
          </div>
        )
      })}
    </RadioGroup>
  )
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 id={id} className="text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function MobileListOptions({ state, set }: { state: ListState; set: (patch: Partial<ListState>) => void }) {
  const ids = useId()
  const viewHeading = `${ids}-view`
  const layoutHeading = `${ids}-layout`
  const dirOptions = SORT_DIRS.map((dir) => ({
    value: dir,
    label: dirLabel(state.sortKey, dir),
    Icon: dirIcon(state.sortKey, dir),
  }))

  return (
    <Sheet>
      {/* The Radix trigger styled as the Button (postxl Button doesn't forwardRef, see FilterButton). */}
      <SheetTrigger
        aria-label={TITLE}
        className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-10 shrink-0')}
      >
        <ArrowUpDown aria-hidden />
      </SheetTrigger>
      <BottomSheet title={TITLE} description="Sortierung und Ansicht einstellen">
        <div className="space-y-5">
          {/* Its two groups carry their own names (Kriterium, Richtung); the heading only titles the block. */}
          <Section title="Sortieren">
            <OptionRadioGroup
              aria-label="Kriterium"
              value={state.sortKey}
              onChange={(sortKey) => set({ sortKey })}
              options={SORT_CRITERIA.map((c) => ({ value: c.key, label: c.label, Icon: c.Icon }))}
            />
            <div className="border-t pt-1.5">
              <OptionRadioGroup
                aria-label="Richtung"
                value={state.sortDir}
                onChange={(sortDir) => set({ sortDir })}
                options={dirOptions}
              />
            </div>
          </Section>
          <Section id={viewHeading} title="Ansicht">
            <OptionRadioGroup
              aria-labelledby={viewHeading}
              value={state.detail}
              onChange={(detail) => set({ detail })}
              options={DETAIL_OPTIONS}
            />
          </Section>
          <Section id={layoutHeading} title="Gliederung">
            <OptionRadioGroup
              aria-labelledby={layoutHeading}
              value={state.grouped ? 'grouped' : 'flat'}
              onChange={(v) => set({ grouped: v === 'grouped' })}
              options={LAYOUT_OPTIONS}
            />
          </Section>
        </div>
      </BottomSheet>
    </Sheet>
  )
}
