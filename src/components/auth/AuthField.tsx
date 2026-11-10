// Label above, help or error text below (the error replaces the help text), wired with aria-invalid and
// aria-describedby. `revealable` adds the show-password button inside the field.
import { useRef, useState, type FocusEvent, type ReactNode, type Ref } from 'react'
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
  const boxRef = useRef<HTMLDivElement>(null)
  // Focus moving to the show-password button in the same box is not leaving the field: no check mid-typing.
  // Tabbing on from the button does leave it, so the button checks too.
  const blur = (e: FocusEvent<HTMLElement>) => {
    if (!boxRef.current?.contains(e.relatedTarget)) onBlur?.()
  }
  const note = error ?? hint
  const noteId = `${id}-note`
  const toggleLabel = revealed ? 'Passwort verbergen' : 'Passwort anzeigen'

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div ref={boxRef} className="relative">
        <Input
          id={id}
          ref={inputRef}
          type={revealable && revealed ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={blur}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={revealable ? 'min-h-10 pr-10' : 'min-h-10'}
        />
        {revealable && (
          <Tooltip>
            {/* span wrapper: postxl Button isn't forwardRef, so the tooltip can only anchor to a host
                element. type="button": inside the form a plain button would submit it. */}
            <TooltipTrigger asChild>
              <span className="absolute top-0 right-0 inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  aria-label={toggleLabel}
                  onClick={() => setRevealed((r) => !r)}
                  onBlur={blur}
                  // Keeps the focus (and the caret) in the field, also where clicking a button doesn't focus it.
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {revealed ? <EyeOff /> : <Eye />}
                </Button>
              </span>
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
