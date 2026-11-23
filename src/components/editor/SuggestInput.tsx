import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Input, cn } from '@postxl/ui-components'

export type Suggestion = { id: string; label: ReactNode }

// The nearest ancestor that scrolls, stopping short of the page itself.
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    if (/^(auto|scroll)$/.test(getComputedStyle(p).overflowY)) return p
  }
  return null
}

// block: 'nearest' within one container only; Element.scrollIntoView would also scroll every outer ancestor and can
// pan the iOS visual viewport.
function bringIntoView(container: HTMLElement, el: HTMLElement) {
  const box = container.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  if (rect.bottom > box.bottom) container.scrollTop += rect.bottom - box.bottom
  if (rect.top < box.top) container.scrollTop -= box.top - rect.top
}

// A text field whose suggestions open right below it while typing (TagPicker pattern, mockup `.unit-in`/`.name-in`):
// the list is rendered inline (no portal), the keyboard stays on the input and drives it via aria-activedescendant.
// It opens on typing or ArrowDown, never on focus, so tabbing through a table row doesn't pop lists open. `openOnClick`
// also opens it on a click or tap, for fields that look like a choice (Einheit) and would otherwise hide their list.
// `keepListInView` (phone sheet, #306): the list opens inside the sheet's scroll region, where the on-screen keyboard
// leaves little room, so that region scrolls to show it, input first. Desktop callers leave it off: there it would
// scroll whatever ancestor happens to scroll.
export function SuggestInput({
  value,
  onValueChange,
  suggestions,
  onSelect,
  onEscape,
  onEnter,
  onBlur,
  openOnClick = false,
  keepListInView = false,
  icon,
  label,
  placeholder,
  className,
  inputClassName,
  id,
  describedBy,
}: {
  value: string
  onValueChange: (value: string) => void
  suggestions: Suggestion[]
  onSelect: (id: string) => void
  onEscape?: () => void
  // Enter while no list is open (e.g. after Escape closed it): confirm what was typed.
  onEnter?: () => void
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void
  openOnClick?: boolean
  keepListInView?: boolean
  icon?: ReactNode
  label: string
  placeholder?: string
  className?: string
  inputClassName?: string
  id?: string
  describedBy?: string
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const activeIndex = Math.min(active, suggestions.length - 1)
  const expanded = open && suggestions.length > 0
  const optionId = (i: number) => `${listId}-${i}`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const reveal = () => {
    const root = rootRef.current
    const container = root && scrollParent(root)
    if (!container || !listRef.current || !inputRef.current) return
    // Input last: when both don't fit, the field stays in view and the list shows as far as there is room. This also
    // undoes scrolling done by hand while typing, which is fine: each keystroke changes the list anyway.
    bringIntoView(container, listRef.current)
    bringIntoView(container, inputRef.current)
  }

  useLayoutEffect(() => {
    if (keepListInView && expanded) reveal()
  }, [keepListInView, expanded, value, suggestions.length])

  useEffect(() => {
    const vv = window.visualViewport
    if (!keepListInView || !expanded || !vv) return
    // The keyboard opening (or resizing) after the list is shown: BottomSheet shrinks the sheet to the visible height on
    // the same event, and its height isn't transitioned, so a frame later the layout is final. Android fires many
    // resize events while the keyboard animates; they are merged per frame. Its `scroll` (iOS offsetTop) only moves the
    // sheet, not its height, so it needs no reveal.
    let frame = 0
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(reveal)
    }
    vv.addEventListener('resize', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      cancelAnimationFrame(frame)
    }
  }, [keepListInView, expanded])

  const select = (id: string) => {
    onSelect(id)
    setOpen(false)
    setActive(0)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return setOpen(true)
      if (suggestions.length === 0) return
      const next = (activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length
      setActive(next)
      document.getElementById(optionId(next))?.scrollIntoView?.({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      if (expanded) {
        e.preventDefault()
        select(suggestions[activeIndex].id)
      } else {
        onEnter?.()
      }
    } else if (e.key === 'Escape') {
      // Usual combobox steps: the first Escape closes the list, the next one reverts. stopPropagation only shields
      // React-level handlers; a Radix sheet listens on document in the capture phase and must check for an open
      // combobox itself (IngredientSheet does, see its onEscapeKeyDown).
      if (expanded) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      } else {
        onEscape?.()
      }
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-label={label}
        aria-describedby={describedBy}
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={expanded ? optionId(activeIndex) : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        className={cn(icon && 'pr-7', inputClassName)}
        onChange={(e) => {
          onValueChange(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onClick={openOnClick ? () => setOpen(true) : undefined}
        onBlur={(e) => {
          setOpen(false)
          onBlur?.(e)
        }}
        onKeyDown={onKeyDown}
      />
      {icon && (
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-subtle-foreground">
          {icon}
        </span>
      )}
      {expanded && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={`${label}: Vorschläge`}
          // mousedown would blur the input (closing the list and committing) before a click on an option or the
          // scrollbar lands.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-0 z-20 mt-1 max-h-60 w-max max-w-72 min-w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => select(s.id)}
              onMouseMove={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center rounded-sm px-2 py-1.5 touch:min-h-10',
                i === activeIndex && 'bg-accent text-accent-foreground',
              )}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
