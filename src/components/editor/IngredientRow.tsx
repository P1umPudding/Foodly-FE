import { useId } from 'react'
import { Input } from '@postxl/ui-components'
import { ChevronDown } from 'lucide-react'
import { IngredientPicker } from './IngredientPicker'
import { RowMenu } from './RowMenu'
import { SuggestInput } from './SuggestInput'
import { UNITS } from '../../editor/units'
import type { DraftIngredient } from '../../editor/draft'
import type { IngredientId } from '../../api/protocol'

// Columns of mockup `.ed-ing`/`.ed-ing-head`: Menge · Einheit · Zutat · Zusatz · ⋮. No grip column: drag & drop isn't
// implemented. Shared with the header so both stay aligned, also with the wider touch menu (design.md §7). Desktop and
// tablet only: the phone shows reading rows and edits in IngredientSheet (#217).
export const INGREDIENT_COLUMNS =
  'grid grid-cols-[96px_90px_minmax(0,1fr)_minmax(0,0.7fr)_30px] items-center gap-1.5 touch:grid-cols-[96px_90px_minmax(0,1fr)_minmax(0,0.7fr)_40px]'

export function UnitInput({
  value,
  onChange,
  className,
  field,
}: {
  value: string
  onChange: (unit: string) => void
  className?: string
  field?: { id?: string; className?: string }
}) {
  const unit = value.trim().toLowerCase()
  return (
    <SuggestInput
      label="Einheit"
      placeholder="Einheit"
      className={className}
      id={field?.id}
      inputClassName={field?.className}
      icon={<ChevronDown className="size-4" />}
      openOnClick
      value={value}
      onValueChange={onChange}
      suggestions={UNITS.filter((u) => u.toLowerCase().startsWith(unit) && u.toLowerCase() !== unit).map((u) => ({
        id: u,
        label: u,
      }))}
      onSelect={onChange}
    />
  )
}

export function pickHandlers(line: DraftIngredient, onChange: (patch: Partial<DraftIngredient>) => void) {
  return {
    // Catalog swap keeps the Zusatz; a free-text name must not become the Zusatz of the picked ingredient.
    onPick: (id: IngredientId) => onChange({ ingredient: id, text: line.ingredient !== null ? line.text : '' }),
    onText: (text: string) => onChange({ ingredient: null, text }),
  }
}

export function IngredientRow({
  line,
  index,
  onChange,
  onUp,
  onDown,
  onRemove,
  onRemovedFocus,
  canMoveUp,
  canMoveDown,
}: {
  line: DraftIngredient
  index: number
  onChange: (patch: Partial<DraftIngredient>) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  onRemovedFocus?: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const isCatalog = line.ingredient !== null
  const zusatzHintId = useId()

  return (
    <div className={INGREDIENT_COLUMNS}>
      {/* amount is a string on the wire: "1-2" and "½" are valid, and the prefix ("ca.") is typed in here too */}
      <Input
        aria-label="Menge"
        className="tabular-nums"
        placeholder="Menge"
        value={line.amount}
        onChange={(e) => onChange({ amount: e.target.value })}
      />
      <UnitInput value={line.unit} onChange={(unit) => onChange({ unit })} />
      <IngredientPicker value={line.ingredient} text={line.text} {...pickHandlers(line, onChange)} />
      {/* Free text keeps its whole name in `text` (nothing is split), so there is no Zusatz to edit. */}
      <Input
        aria-label="Zusatz"
        disabled={!isCatalog}
        aria-describedby={isCatalog ? undefined : zusatzHintId}
        value={isCatalog ? line.text : ''}
        onChange={(e) => onChange({ text: e.target.value })}
      />
      {!isCatalog && (
        <span id={zusatzHintId} className="sr-only">
          Zusatz nur bei Zutaten aus dem Katalog
        </span>
      )}
      <RowMenu
        label={`Zutat ${index + 1}: Aktionen`}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onUp={onUp}
        onDown={onDown}
        onRemove={onRemove}
        onRemovedFocus={onRemovedFocus}
      />
    </div>
  )
}
