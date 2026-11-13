import { useId, useState } from 'react'
import { Input, Label, RadioGroup, RadioGroupItem } from '@postxl/ui-components'
import type { Draft, SizeMode } from '../../editor/draft'

// sizeNumber and sizeText are mutually exclusive in the model (PortionScaler
// branches on whether sizeNumber is set), so the mode is an explicit choice rather
// than something inferred from which field the user touched last.
export function SizeField({
  mode,
  sizeNumber,
  sizeText,
  error,
  onChange,
}: {
  mode: SizeMode
  sizeNumber: number | null
  sizeText: string
  error: string | null
  onChange: (patch: Partial<Draft>) => void
}) {
  const errorId = useId()
  // The error shows once the field is left (docs/design.md §6), except for a value
  // that was already invalid when the editor opened (old data): that one shows at
  // once, until it is fixed. Read on mount, which works because the editor only
  // renders this field once the recipe has loaded.
  const [touched, setTouched] = useState(false)
  const [invalidOnOpen, setInvalidOnOpen] = useState(error !== null)
  if (invalidOnOpen && error === null) setInvalidOnOpen(false)
  const shownError = error !== null && (touched || invalidOnOpen) ? error : null

  return (
    <div className="flex flex-col gap-2">
      <Label>Größe</Label>
      <RadioGroup
        value={mode}
        onValueChange={(next) =>
          onChange(next === 'portions' ? { sizeMode: 'portions' } : { sizeMode: 'text', sizeNumber: null })
        }
        className="flex gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="portions" id="size-portions" />
          <Label htmlFor="size-portions">Portionen</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="text" id="size-text" />
          <Label htmlFor="size-text">Freitext</Label>
        </div>
      </RadioGroup>

      <div className="flex gap-2">
        {mode === 'portions' && (
          <Input
            type="number"
            min={1}
            aria-label="Anzahl"
            className="w-24"
            value={sizeNumber ?? ''}
            onChange={(e) => onChange({ sizeNumber: e.target.value === '' ? null : Number(e.target.value) })}
            onBlur={() => setTouched(true)}
            aria-invalid={shownError !== null || undefined}
            aria-describedby={shownError !== null ? errorId : undefined}
          />
        )}
        <Input
          aria-label="Bezeichnung"
          className="flex-1"
          placeholder={mode === 'portions' ? '{Portionen}' : '28 cm {Springform}'}
          value={sizeText}
          onChange={(e) => onChange({ sizeText: e.target.value })}
        />
      </div>
      {shownError !== null && (
        <p id={errorId} className="text-sm text-destructive">
          {shownError}
        </p>
      )}
    </div>
  )
}
