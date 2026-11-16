import { useRef, type MouseEvent, type ReactNode } from 'react'
import { ChevronDown, X, type LucideIcon } from 'lucide-react'
import { Button, cn, SheetClose } from '@postxl/ui-components'
import { ResponsivePanel } from '../ResponsivePanel'
import { TriggerButton } from '../TriggerButton'
import { ResetLinkButton } from './ResetLinkButton'
import type { FilterValue } from '../../list/filterLabels'

// One button of the filter bar (mockup screens.css .fbtn): one frame around the trigger and, while active, its ✕ as a
// sibling behind a hairline (a button can't nest in the trigger). Inactive: facet icon, name, chevron. Active:
// "<Filter>: <Wert> +n" with a surface-coloured frame in border-strong. Popover on desktop, bottom sheet on phones
// (docs/design.md §7), 40 px tall there.
export function FilterButton({
  label,
  icon: Icon,
  value,
  onClear,
  children,
}: {
  label: string
  icon: LucideIcon
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

  // The panel's own „Zurücksetzen“ unmounts with the value too. Its mousedown keeps focus where it was, so the
  // button only holds focus when it got there by keyboard; then focus moves to the panel. Otherwise it stays put:
  // moving it would blur the Arbeitszeit field, whose blur commits its typed draft right after the reset.
  const resetInPanel = (e: MouseEvent<HTMLButtonElement>) => {
    const panel = e.currentTarget.closest<HTMLElement>('[role=dialog]')
    const hadFocus = document.activeElement === e.currentTarget
    onClear()
    if (hadFocus) panel?.focus()
    // The reset can also unmount the row that had focus (a selected ingredient past the cap): catch it after the
    // re-render instead of losing focus to <body>.
    else
      requestAnimationFrame(() => {
        if (panel?.isConnected && !panel.contains(document.activeElement)) panel.focus()
      })
  }
  const panelReset = active && (
    <ResetLinkButton onMouseDown={(e) => e.preventDefault()} onClick={resetInPanel} className="phone:h-10">
      Zurücksetzen
    </ResetLinkButton>
  )

  return (
    // Open: Popover/SheetTrigger set data-state=open on the trigger itself (no Tooltip wraps it here, unlike the view
    // toggles), so the frame can follow it via :has.
    <div
      data-slot="filter-button"
      className={cn(
        'inline-flex h-[30px] items-stretch overflow-hidden rounded-md border bg-card phone:h-10', // 30 px: mockup .fbtn
        active && 'border-border-strong',
        'has-[[data-state=open]]:border-subtle-foreground',
      )}
    >
      <ResponsivePanel
        trigger={
          <TriggerButton
            ref={triggerRef}
            variant="bare"
            // ring-inset: the frame's overflow-hidden would clip an outer ring.
            className="inline-flex max-w-56 cursor-pointer items-center gap-1.5 pl-2.5 pr-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-hover focus-visible:ring-inset focus-visible:ring-ring"
          >
            {/* Only the value truncates: "<Filter>:" and "+n" always stay visible. The spaces between the spans keep
                the accessible name readable; flex drops them visually. The label stays muted, not the mockup's
                subtle: subtle is no AA for small text (docs/design.md §2). */}
            {active ? (
              <>
                <span className="shrink-0">{label}:</span>{' '}
                <span className="min-w-0 max-w-45 truncate font-semibold text-foreground">{value.first}</span>
                {value.more > 0 && (
                  <>
                    {' '}
                    <span className="shrink-0 text-foreground">+{value.more}</span>
                  </>
                )}
              </>
            ) : (
              <>
                <Icon aria-hidden className="size-3.5 shrink-0 text-subtle-foreground" />
                {label}
                <ChevronDown aria-hidden className="size-3.5 shrink-0 text-subtle-foreground" />
              </>
            )}
          </TriggerButton>
        }
        // The mockup opens a filter without focusing its search: on phones that would pop the keyboard over the
        // options. Focus goes to the panel itself, so Tab still enters it (a non-modal popover is portalled away
        // from the trigger).
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          if (e.currentTarget instanceof HTMLElement) e.currentTarget.focus()
        }}
        popover={{
          'aria-label': label,
          align: 'start',
          className: 'w-[280px] p-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        }}
        sheet={{
          title: label,
          description: `Filter ${label} einstellen`,
          scroll: false,
          className: 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        }}
      >
        {(variant) =>
          variant === 'popover' ? (
            <>
              {children}
              {panelReset && <div className="mt-1.5 flex border-t border-divider pt-1.5">{panelReset}</div>}
            </>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1.5 pb-4">{children}</div>
              {/* „Anzeigen“ closes only: changes apply as they are made. */}
              <div className="flex items-center gap-2 border-t px-4 py-3">
                {panelReset}
                <Button asChild className="flex-1 phone:h-10">
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
          variant="ghost"
          size="icon"
          aria-label={`${label} entfernen`}
          onClick={clear}
          // size-auto: postxl's icon size ships size-9, which twMerge keeps next to h-full/w-auto. px-[7px]: mockup .fb-x.
          // border-border on focus: postxl turns the border ring-coloured, which would recolour the hairline.
          className="size-auto h-full w-auto rounded-none border-l px-[7px] text-muted-foreground hover:bg-hover hover:text-foreground focus-visible:border-border focus-visible:ring-inset dark:hover:bg-hover phone:w-10"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}