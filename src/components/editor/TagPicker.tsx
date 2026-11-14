import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Button, Input, cn } from '@postxl/ui-components'
import { X } from 'lucide-react'
import { useTags } from '../../catalog/CatalogProvider'
import { TagIcon } from '../TagText'
import type { TagId } from '../../api/protocol'

// One field with the chosen tags as chips and an input "Tag hinzufügen" (mockup `.tags-input`); the suggestions open
// right below it while typing (a combobox, no popover with a search field of its own). Selection only: the backend has
// no create-tag endpoint, and a recipe naming an unknown tag is rejected with 422, so Enter on free text does nothing.
// The list is rendered inline (no portal) and the keyboard stays on the input, which drives it via aria-activedescendant.
export function TagPicker({
  inputId,
  value,
  onChange,
}: {
  inputId: string
  value: TagId[]
  onChange: (tags: TagId[]) => void
}) {
  const { byId } = useTags()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // Focus handed back after removing a chip shouldn't pop the suggestions open.
  const skipOpen = useRef(false)

  const q = query.trim().toLowerCase()
  const options = Object.keys(byId).filter((id) => !value.includes(id) && id.toLowerCase().includes(q))
  const activeIndex = Math.min(active, options.length - 1)
  const optionId = (i: number) => `${listId}-${i}`

  const add = (id: TagId) => {
    onChange([...value, id])
    setQuery('')
    setActive(0)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return setOpen(true)
      if (options.length === 0) return
      const next = (activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
      setActive(next)
      document.getElementById(optionId(next))?.scrollIntoView?.({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      // Never submits anything; an unknown tag simply isn't added.
      e.preventDefault()
      if (open && activeIndex >= 0) add(options[activeIndex])
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        setOpen(false)
      }
    } else if (e.key === 'Backspace' && query === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const expanded = open && options.length > 0
  const noMatch = open && options.length === 0 && q !== ''

  return (
    <div className="relative">
      {/* Hand-built field look (border, shadow, focus) because the chips sit inside it: the postxl Input only styles
          itself. Clicks on the field's free space focus the input, as in a native field. */}
      <div
        className="flex min-h-[38px] cursor-text flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-[5px] shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault()
            inputRef.current?.focus()
          }
        }}
      >
        {value.map((id) => (
          <span
            key={id}
            className="inline-flex h-[22px] max-w-full min-w-0 items-center gap-1 rounded-sm bg-tag pr-1 pl-2 text-xs font-medium text-muted-foreground"
          >
            {byId[id]?.svg && <TagIcon tag={byId[id]} alt="" size="xs" />}
            <span className="truncate">{id}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${id} entfernen`}
              // The hit area grows past the 22 px chip on touch (design.md §7) without growing the chip.
              className="relative size-4 shrink-0 rounded-sm text-muted-foreground after:absolute after:-inset-1 touch:after:-inset-3"
              onClick={() => {
                onChange(value.filter((t) => t !== id))
                // The chip and its ✕ are gone: keep focus in the field.
                skipOpen.current = true
                inputRef.current?.focus()
                skipOpen.current = false
              }}
            >
              <X className="size-3" />
            </Button>
          </span>
        ))}
        <Input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          placeholder="Tag hinzufügen"
          value={query}
          className="h-7 min-w-[100px] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => {
            if (!skipOpen.current) setOpen(true)
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </div>
      {expanded && (
        <div
          id={listId}
          role="listbox"
          aria-label="Tag-Vorschläge"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.map((id, i) => (
            <div
              key={id}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown would blur the input (and close the list) before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(id)}
              onMouseMove={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 touch:min-h-10',
                i === activeIndex && 'bg-accent text-accent-foreground',
              )}
            >
              {byId[id]?.svg && <TagIcon tag={byId[id]} alt="" size="sm" />}
              {id}
            </div>
          ))}
        </div>
      )}
      {/* Outside the listbox (only options belong in there); a live region, so typing into nothing is announced. */}
      <p role="status" className="absolute inset-x-0 top-full z-20">
        {noMatch && (
          <span className="mt-1 block rounded-md border bg-popover px-3 py-2 text-muted-foreground shadow-md">
            Kein passender Tag.
          </span>
        )}
      </p>
    </div>
  )
}
