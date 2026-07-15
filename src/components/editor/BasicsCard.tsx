import { Button, Card, CardContent, Input, Label } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { RowActions } from './RowActions'
import { SizeField } from './SizeField'
import { TagPicker } from './TagPicker'
import { TagText } from '../TagText'
import { move, newNote } from '../../editor/draft'
import type { Draft } from '../../editor/draft'

// Minutes are plain number inputs: the existing DurationPicker is the timer's
// h:m:s drum wheel, which is the wrong control for a form field.
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
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={0}
          className="w-24"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
        <span className="text-muted-foreground">Min.</span>
      </div>
    </div>
  )
}

export function BasicsCard({ draft, onChange }: { draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="recipe-name">Titel</Label>
          <Input
            id="recipe-name"
            value={draft.name}
            placeholder="Cremige Pilz-Pasta"
            onChange={(e) => onChange({ name: e.target.value })}
          />
          {/* {Tag} tokens render as icons on the detail page — show what they'll become. */}
          {draft.name.includes('{') && (
            <p className="text-muted-foreground">
              Vorschau: <TagText value={draft.name} />
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="recipe-source">Quelle</Label>
          <Input
            id="recipe-source"
            value={draft.source}
            placeholder="Omas Rezept oder https://…"
            onChange={(e) => onChange({ source: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap gap-6">
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

        <SizeField mode={draft.sizeMode} sizeNumber={draft.sizeNumber} sizeText={draft.sizeText} onChange={onChange} />

        <div className="flex flex-col gap-2">
          <Label>Tags</Label>
          <TagPicker value={draft.tags} onChange={(tags) => onChange({ tags })} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Notizen</Label>
          {draft.notes.map((note, i) => (
            <div key={note.key} className="flex items-center gap-2">
              <Input
                aria-label={`Notiz ${i + 1}`}
                className="flex-1"
                value={note.text}
                onChange={(e) =>
                  onChange({
                    notes: draft.notes.map((n) => (n.key === note.key ? { ...n, text: e.target.value } : n)),
                  })
                }
              />
              <RowActions
                onUp={() => onChange({ notes: move(draft.notes, note.key, -1) })}
                onDown={() => onChange({ notes: move(draft.notes, note.key, 1) })}
                onRemove={() => onChange({ notes: draft.notes.filter((n) => n.key !== note.key) })}
                canMoveUp={i > 0}
                canMoveDown={i < draft.notes.length - 1}
                removeLabel={`Notiz ${i + 1} entfernen`}
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-start gap-1.5 text-primary"
            onClick={() => onChange({ notes: [...draft.notes, newNote()] })}
          >
            <Plus className="h-4 w-4" />
            Notiz hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
