import { Card, CardContent, Input, Label, NumberInput } from '@postxl/ui-components'
import { SizeField } from './SizeField'
import { TagPicker } from './TagPicker'
import { TagText } from '../TagText'
import { sizeNumberError } from '../../editor/draft'
import type { Draft } from '../../editor/draft'

// Minutes are plain numbers: a recipe's times are whole minutes, no h:m:s entry needed.
function MinutesField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number | null
  onChange: (value: number | null) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NumberInput
        id={id}
        min={0}
        suffix="min"
        className="text-left"
        value={value ?? undefined}
        onChange={(v) => onChange(v ?? null)}
      />
    </div>
  )
}

// The main card of the editor (mockup `.ed-basics`): title, times, size and tags. Source and notes live in the side
// column.
export function BasicsCard({ draft, onChange }: { draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-4 p-4 phone:p-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recipe-name">Titel</Label>
          <Input
            id="recipe-name"
            value={draft.name}
            placeholder="Cremige Pilz-Pasta"
            className="h-11 text-xl font-semibold md:text-xl"
            onChange={(e) => onChange({ name: e.target.value })}
          />
          {/* {Tag} tokens render as icons on the detail page — show what they'll become. */}
          {draft.name.includes('{') && (
            <p className="text-muted-foreground">
              Vorschau: <TagText value={draft.name} />
            </p>
          )}
        </div>

        <div className="grid grid-cols-[repeat(2,minmax(0,160px))] gap-3 phone:grid-cols-2 phone:gap-2">
          <MinutesField
            id="work-minutes"
            label="Arbeitszeit"
            value={draft.workMinutes}
            onChange={(workMinutes) => onChange({ workMinutes })}
          />
          <MinutesField
            id="overall-minutes"
            label="Gesamtzeit"
            value={draft.overallMinutes}
            onChange={(overallMinutes) => onChange({ overallMinutes })}
          />
        </div>

        <SizeField
          mode={draft.sizeMode}
          sizeNumber={draft.sizeNumber}
          sizeText={draft.sizeText}
          error={sizeNumberError(draft)}
          onChange={onChange}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recipe-tags">Tags</Label>
          <TagPicker inputId="recipe-tags" value={draft.tags} onChange={(tags) => onChange({ tags })} />
        </div>
      </CardContent>
    </Card>
  )
}
