import { useRef } from 'react'
import { Card, CardContent, Input } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { TriggerButton } from '../TriggerButton'
import { COL_HEAD } from './EditorSidebar'
import { INGREDIENT_COLUMNS, IngredientRow } from './IngredientRow'
import { RowMenu } from './RowMenu'
import { StepRow } from './StepRow'
import { move, newIngredient, newStep } from '../../editor/draft'
import type { DraftIngredient, DraftSection } from '../../editor/draft'

// One card per section (mockup `.ed-sec`): the name as the card's heading with ⋯ beside it, ingredients as a table,
// numbered steps. The "+" buttons are muted like the mockup's `.btn.add` (audit E9).
const ADD_BUTTON = 'gap-1.5 self-start text-muted-foreground touch:h-10'

export function SectionEditor({
  section,
  index,
  total,
  showTimerHint = false,
  onChange,
  onUp,
  onDown,
  onRemove,
  onRemovedFocus,
}: {
  section: DraftSection
  index: number
  total: number
  showTimerHint?: boolean
  onChange: (next: DraftSection) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  onRemovedFocus?: () => void
}) {
  const addIngredient = useRef<HTMLButtonElement>(null)
  const addStep = useRef<HTMLButtonElement>(null)
  const patchIngredient = (key: number, patch: Partial<DraftIngredient>) =>
    onChange({
      ...section,
      ingredients: section.ingredients.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    })

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4 phone:p-3.5">
        <div className="mb-2 flex items-center gap-2">
          {/* The name is the card's heading (mockup `.ed-sec-name`): a borderless field until hovered or focused. */}
          <Input
            variant="discreet"
            aria-label="Abschnittsname"
            placeholder="Abschnitt ohne Namen"
            className="flex-1 px-1 text-lg font-semibold"
            value={section.name}
            onChange={(e) => onChange({ ...section, name: e.target.value })}
          />
          <RowMenu
            label={`Abschnitt ${index + 1}: Aktionen`}
            icon="horizontal"
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            onUp={onUp}
            onDown={onDown}
            onRemove={onRemove}
            onRemovedFocus={onRemovedFocus}
          />
        </div>

        {section.ingredients.length > 0 && (
          <div className={`${INGREDIENT_COLUMNS} text-xs font-medium text-subtle-foreground phone:hidden`}>
            <span>Menge</span>
            <span>Einheit</span>
            <span>Zutat</span>
            <span>Zusatz</span>
          </div>
        )}
        {section.ingredients.map((line, i) => (
          <IngredientRow
            key={line.key}
            line={line}
            index={i}
            onChange={(patch) => patchIngredient(line.key, patch)}
            onUp={() => onChange({ ...section, ingredients: move(section.ingredients, line.key, -1) })}
            onDown={() => onChange({ ...section, ingredients: move(section.ingredients, line.key, 1) })}
            onRemove={() =>
              onChange({ ...section, ingredients: section.ingredients.filter((r) => r.key !== line.key) })
            }
            onRemovedFocus={() => addIngredient.current?.focus()}
            canMoveUp={i > 0}
            canMoveDown={i < section.ingredients.length - 1}
          />
        ))}
        <TriggerButton
          ref={addIngredient}
          variant="ghost"
          size="sm"
          aria-label="Zutat hinzufügen"
          className={ADD_BUTTON}
          onClick={() => onChange({ ...section, ingredients: [...section.ingredients, newIngredient()] })}
        >
          <Plus className="size-4" />
          Zutat
        </TriggerButton>

        <h3 className={`${COL_HEAD} mt-[18px]`}>Zubereitung</h3>
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
            onRemovedFocus={() => addStep.current?.focus()}
            canMoveUp={i > 0}
            canMoveDown={i < section.steps.length - 1}
          />
        ))}
        <TriggerButton
          ref={addStep}
          variant="ghost"
          size="sm"
          aria-label="Schritt hinzufügen"
          className={ADD_BUTTON}
          onClick={() => onChange({ ...section, steps: [...section.steps, newStep()] })}
        >
          <Plus className="size-4" />
          Schritt
        </TriggerButton>
        {showTimerHint && (
          <p className="mt-1 text-xs text-muted-foreground">
            Zeitangaben wie „30 Minuten“ werden im Rezept zu Timern, die man antippen kann.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
