// Label above, help or error text below (the error replaces the help text), wired with aria-invalid and
// aria-describedby. `revealable` adds the show-password button inside the field.
import { useState, type ReactNode, type Ref } from 'react'
import { Button, Input, Label, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { Eye, EyeOff } from 'lucide-react'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  type?: 'text' | 'email' | 'password'
  autoComplete: string
  autoFocus?: boolean
  error?: ReactNode
  hint?: string
  revealable?: boolean
  inputRef?: Ref<HTMLInputElement>
}

export function AuthField({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  autoComplete,
  autoFocus,
  error,
  hint,
  revealable,
  inputRef,
}: Props) {
  const [revealed, setRevealed] = useState(false)
  const note = error ?? hint
  const noteId = `${id}-note`
  const toggleLabel = revealed ? 'Passwort verbergen' : 'Passwort anzeigen'

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          type={revealable && revealed ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={revealable ? 'min-h-10 pr-10' : 'min-h-10'}
        />
        {revealable && (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* type="button": inside the form a plain button would submit it */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 size-10"
                aria-label={toggleLabel}
                onClick={() => setRevealed((r) => !r)}
              >
                {revealed ? <EyeOff /> : <Eye />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{toggleLabel}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {note && (
        <p id={noteId} className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
          {note}
        </p>
      )}
    </div>
  )
}
