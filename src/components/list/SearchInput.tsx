import { Button, Input } from '@postxl/ui-components'
import { X } from 'lucide-react'

// Text input with a built-in clear button — shared by the page search and the
// tag/ingredient field searches so the clear affordance and (default, visible)
// focus ring live in one place.
export function SearchInput({
  value,
  onChange,
  placeholder,
  clearLabel = 'Leeren',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  clearLabel?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pr-9"
      />
      {value !== '' && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={clearLabel}
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
