import { useRef, type ReactNode } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Button, cn, SheetClose } from '@postxl/ui-components'
import { ResponsivePanel } from '../ResponsivePanel'
import { TriggerButton } from '../TriggerButton'
import type { FilterValue } from '../../list/filterLabels'

// The outline variant brings its own dark and hover colours, which a plain bg-muted doesn't override.
const ACTIVE = 'bg-muted font-medium hover:bg-muted/80 hover:text-foreground dark:bg-muted dark:hover:bg-muted/80'

// One button of the filter bar: shows "<Filter>: <Wert> +n" while active, with its own ✕ as a sibling
// (a button can't nest in the trigger). Popover on desktop, bottom sheet on phones (docs/design.md §7).
export function FilterButton({
  label,
  value,
  onClear,
  children,
}: {
  label: string
  value: FilterValue | null
  onClear: () => void
  children: ReactNode
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const active = value !== null

  const clear = () => {
    onClear()
    // The ✕ unmounts with the value, so hand focus to the trigger rather than lose it to <body>.
    triggerRef.current?.focus()
  }

  return (
    <div className="inline-flex items-center">
      <ResponsivePanel
        trigger={
          <TriggerButton
            ref={triggerRef}
            variant="outline"
            size="sm"
            className={cn(
              'relative max-w-56 focus-visible:z-10 phone:h-10',
              active ? cn(ACTIVE, 'rounded-r-none border-r-0') : 'font-normal',
            )}
          >
            {/* Only the first name truncates: "<Filter>:" and "+n" always stay visible. The spaces between
                the spans keep the accessible name readable; flex drops them visually. */}
            {active ? (
              <>
                <span className="shrink-0">{label}:</span> <span className="min-w-0 truncate">{value.first}</span>
                {value.more > 0 && (
                  <>
                    {' '}
                    <span className="shrink-0">+{value.more}</span>
                  </>
                )}
              </>
            ) : (
              label
            )}
            {!active && <ChevronDown aria-hidden />}
          </TriggerButton>
        }
        popover={{ 'aria-label': label, align: 'start' }}
        sheet={{ title: label, description: `Filter ${label} einstellen`, scroll: false }}
      >
        {(variant) =>
          variant === 'popover' ? (
            children
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
              {/* Closes only: changes apply as they are made. */}
              <div className="border-t px-4 py-3">
                <Button asChild className="w-full phone:h-10">
                  <SheetClose>Anzeigen</SheetClose>
                </Button>
              </div>
            </>
          )
        }
      </ResponsivePanel>
      {active && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${label} entfernen`}
          onClick={clear}
          className={cn('relative size-8 rounded-l-none focus-visible:z-10 phone:size-10', ACTIVE)}
        >
          <X />
        </Button>
      )}
    </div>
  )
}
