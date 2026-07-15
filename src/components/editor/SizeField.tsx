import { Input, Label, RadioGroup, RadioGroupItem } from '@postxl/ui-components'
import type { Draft, SizeMode } from '../../editor/draft'

// sizeNumber and sizeText are mutually exclusive in the model (PortionScaler
// branches on sizeNumber !== null), so the mode is an explicit choice rather
// than something inferred from which field the user touched last.
export function SizeField({
  mode,
  sizeNumber,
  sizeText,
  onChange,
}: {
  mode: SizeMode
  sizeNumber: number | null
  sizeText: string
  onChange: (patch: Partial<Draft>) => void
}) {
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
    </div>
  )
}
