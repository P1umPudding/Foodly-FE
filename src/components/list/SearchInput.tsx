import { Button, Input } from '@postxl/ui-components'
import type { Ref } from 'react'
import { Search, X } from 'lucide-react'

// Text input with a magnifier and a built-in clear button — shared by the page search and the
// tag/ingredient field searches so the clear affordance and (default, visible)
// focus ring live in one place.
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  clearLabel = 'Leeren',
  className = '',
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  // Accessible name; a placeholder alone disappears as you type and isn't a reliable label.
  label?: string
  clearLabel?: string
  className?: string
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      {/* 40 px on phones like every tap target there (docs/design.md §7). */}
      <Input
        ref={inputRef}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-9 phone:h-10"
      />
      {value !== '' && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={clearLabel}
          onClick={() => onChange('')}
          // Visibly 28 px so it fits inside the input (36 px, 40 px on phones); on phones the ::after widens the hit area to 40 px.
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 phone:after:absolute phone:after:-inset-1.5"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
