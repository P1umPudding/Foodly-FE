import { useId, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Input, cn } from '@postxl/ui-components'

export type Suggestion = { id: string; label: ReactNode }

// A text field whose suggestions open right below it while typing (TagPicker pattern, mockup `.unit-in`/`.name-in`):
// the list is rendered inline (no portal), the keyboard stays on the input and drives it via aria-activedescendant.
// It opens on typing or ArrowDown, never on focus, so tabbing through a table row doesn't pop lists open. `openOnClick`
// also opens it on a click or tap, for fields that look like a choice (Einheit) and would otherwise hide their list.
export function SuggestInput({
  value,
  onValueChange,
  suggestions,
  onSelect,
  onEscape,
  onBlur,
  openOnClick = false,
  icon,
  label,
  placeholder,
  className,
  inputClassName,
}: {
  value: string
  onValueChange: (value: string) => void
  suggestions: Suggestion[]
  onSelect: (id: string) => void
  onEscape?: () => void
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void
  openOnClick?: boolean
  icon?: ReactNode
  label: string
  placeholder?: string
  className?: string
  inputClassName?: string
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const activeIndex = Math.min(active, suggestions.length - 1)
  const expanded = open && suggestions.length > 0
  const optionId = (i: number) => `${listId}-${i}`

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
      }
    } else if (e.key === 'Escape') {
      // Usual combobox steps: the first Escape closes the list, the next one reverts. Closing the list must not also
      // close a surrounding sheet or dialog.
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
    <div className={cn('relative', className)}>
      <Input
        role="combobox"
        aria-label={label}
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
                'cursor-pointer rounded-sm px-2 py-1.5 touch:min-h-10',
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
