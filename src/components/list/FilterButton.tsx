import { useId, type ReactNode } from 'react'
import { ChevronDown, X } from 'lucide-react'
import {
  Button,
  buttonVariants,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetClose,
  SheetTrigger,
} from '@postxl/ui-components'
import { BottomSheet } from '../BottomSheet'
import { useIsDesktop } from '../../hooks/useIsDesktop'

// The outline variant brings its own dark and hover colours, which a plain bg-muted doesn't override.
const ACTIVE = 'bg-muted font-medium hover:bg-muted/80 hover:text-foreground dark:bg-muted dark:hover:bg-muted/80'

// One button of the filter bar: shows "<Filter>: <Wert>" while active, with its own ✕ as a sibling
// (a button can't nest in the trigger). Popover on desktop, bottom sheet on phones (docs/design.md §7).
export function FilterButton({
  label,
  value,
  onClear,
  children,
}: {
  label: string
  value: string | null
  onClear: () => void
  children: ReactNode
}) {
  const isDesktop = useIsDesktop()
  const triggerId = useId()
  const Root = isDesktop ? Popover : Sheet
  const Trigger = isDesktop ? PopoverTrigger : SheetTrigger
  const active = value !== null

  const clear = () => {
    onClear()
    // The ✕ unmounts with the value, so hand focus to the trigger rather than lose it to <body>.
    // By id: the postxl PopoverTrigger doesn't forwardRef.
    document.getElementById(triggerId)?.focus()
  }

  return (
    <div className="inline-flex items-center">
      <Root>
        {/* The Radix trigger itself, styled as the Button: the postxl Button doesn't forwardRef, which Radix needs
            for positioning and focus return. Long values truncate so the bar keeps its layout on phones. */}
        <Trigger
          id={triggerId}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'relative max-w-56 focus-visible:z-10 phone:h-10',
            active ? cn(ACTIVE, 'rounded-r-none border-r-0') : 'font-normal',
          )}
        >
          <span className="truncate">{active ? `${label}: ${value}` : label}</span>
          {!active && <ChevronDown aria-hidden />}
        </Trigger>
        {isDesktop ? (
          <PopoverContent align="start" aria-label={label}>
            {children}
          </PopoverContent>
        ) : (
          <BottomSheet title={label} description={`Filter ${label} einstellen`} scroll={false}>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
            {/* Closes only: changes apply as they are made. */}
            <div className="border-t px-4 py-3">
              <Button asChild className="w-full phone:h-10">
                <SheetClose>Anzeigen</SheetClose>
              </Button>
            </div>
          </BottomSheet>
        )}
      </Root>
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
