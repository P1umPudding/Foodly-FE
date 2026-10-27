import { Button, Card, CardContent, Input, Label } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { IngredientRow } from './IngredientRow'
import { RowActions } from './RowActions'
import { StepRow } from './StepRow'
import { move, newIngredient, newStep } from '../../editor/draft'
import type { DraftIngredient, DraftSection } from '../../editor/draft'

export function SectionEditor({
  section,
  index,
  total,
  onChange,
  onUp,
  onDown,
  onRemove,
}: {
  section: DraftSection
  index: number
  total: number
  onChange: (next: DraftSection) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
}) {
  const patchIngredient = (key: number, patch: Partial<DraftIngredient>) =>
    onChange({
      ...section,
      ingredients: section.ingredients.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    })

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor={`section-${section.key}`}>Abschnittsname</Label>
            <Input
              id={`section-${section.key}`}
              aria-label="Abschnittsname"
              placeholder="ohne Namen"
              value={section.name}
              onChange={(e) => onChange({ ...section, name: e.target.value })}
            />
          </div>
          <RowActions
            onUp={onUp}
            onDown={onDown}
            onRemove={onRemove}
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            removeLabel="Abschnitt entfernen"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Zutaten</Label>
          {section.ingredients.map((line, i) => (
            <IngredientRow
              key={line.key}
              line={line}
              onChange={(patch) => patchIngredient(line.key, patch)}
              onUp={() => onChange({ ...section, ingredients: move(section.ingredients, line.key, -1) })}
              onDown={() => onChange({ ...section, ingredients: move(section.ingredients, line.key, 1) })}
              onRemove={() =>
                onChange({ ...section, ingredients: section.ingredients.filter((r) => r.key !== line.key) })
              }
              canMoveUp={i > 0}
              canMoveDown={i < section.ingredients.length - 1}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-start gap-1.5 text-primary"
            onClick={() => onChange({ ...section, ingredients: [...section.ingredients, newIngredient()] })}
          >
            <Plus className="h-4 w-4" />
            Zutat hinzufügen
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Zubereitung</Label>
          {section.steps.map((step, i) => (
            <StepRow
              key={step.key}
              index={i}
              text={step.text}
              onChange={(text) =>
                onChange({ ...section, steps: section.steps.map((s) => (s.key === step.key ? { ...s, text } : s)) })
              }
              onUp={() => onChange({ ...section, steps: move(section.steps, step.key, -1) })}
              onDown={() => onChange({ ...section, steps: move(section.steps, step.key, 1) })}
              onRemove={() => onChange({ ...section, steps: section.steps.filter((s) => s.key !== step.key) })}
              canMoveUp={i > 0}
              canMoveDown={i < section.steps.length - 1}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-start gap-1.5 text-primary"
            onClick={() => onChange({ ...section, steps: [...section.steps, newStep()] })}
          >
            <Plus className="h-4 w-4" />
            Schritt hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
