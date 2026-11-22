import { useId, useState } from 'react'
import { Input, Label, ToggleGroup, cn } from '@postxl/ui-components'
import { FocusToggleGroupItem } from '../list/FocusToggleGroupItem'
import { SEG_ITEM, SEG_ITEM_ON, SEG_TRACK } from '../list/Segment'
import type { Draft, SizeMode } from '../../editor/draft'

// sizeNumber and sizeText are mutually exclusive in the model (PortionScaler
// branches on whether sizeNumber is set), so the mode is an explicit choice rather
// than something inferred from which field the user touched last.
const SIZE_MODES: [SizeMode, string][] = [
  ['portions', 'Portionen'],
  ['text', 'Freitext'],
]

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
  const labelId = useId()
  // The error shows once the field is left (docs/design.md §6), except for a value
  // that was already invalid when the editor opened (old data): that one shows at
  // once, until it is fixed. Read on mount, which works because the editor only
  // renders this field once the recipe has loaded.
  const [touched, setTouched] = useState(false)
  const [invalidOnOpen, setInvalidOnOpen] = useState(error !== null)
  if (invalidOnOpen && error === null) setInvalidOnOpen(false)
  const shownError = error !== null && (touched || invalidOnOpen) ? error : null

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={labelId}>Größe</Label>
      {/* The segment track of Segment.tsx. Radix renders its items as radios; an empty value (re-clicking the
          active one) is ignored, so one mode is always chosen. The active look is set via data-[state=on] too:
          otherwise postxl's data-[state=on]:bg-accent wins over a plain bg-card. */}
      <ToggleGroup
        type="single"
        value={mode}
        aria-labelledby={labelId}
        onValueChange={(next) => {
          if (next === 'portions') onChange({ sizeMode: 'portions' })
          else if (next === 'text') onChange({ sizeMode: 'text', sizeNumber: null })
        }}
        className={cn(SEG_TRACK, 'self-start')}
      >
        {SIZE_MODES.map(([value, label]) => (
          <FocusToggleGroupItem
            key={value}
            value={value}
            className={cn(
              SEG_ITEM,
              'h-8 hover:bg-transparent hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground touch:h-10',
              mode === value && cn(SEG_ITEM_ON, 'hover:bg-card'),
            )}
          >
            {label}
          </FocusToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="mt-1 flex gap-2">
        {mode === 'portions' && (
          <Input
            type="number"
            min={1}
            aria-label="Anzahl"
            className="w-[72px]"
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
          placeholder={mode === 'portions' ? '{Portionen}' : '26 cm {Springform}'}
          value={sizeText}
          onChange={(e) => onChange({ sizeText: e.target.value })}
        />
      </div>
      {shownError !== null && (
        <p id={errorId} className="text-sm text-destructive">
          {shownError}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Portionen: Beim Kochen wählt man die Anzahl, Mengen rechnen sich um. Freitext (z. B. „26 cm {'{Springform}'}“):
        Man skaliert mit einem Faktor ×½, ×2 …
      </p>
    </div>
  )
}
