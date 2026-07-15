import { Input } from '@postxl/ui-components'
import { IngredientPicker } from './IngredientPicker'
import { RowActions } from './RowActions'
import type { DraftIngredient } from '../../editor/draft'

export function IngredientRow({
  line,
  onChange,
  onUp,
  onDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  line: DraftIngredient
  onChange: (patch: Partial<DraftIngredient>) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label="Präfix"
        className="w-16"
        placeholder="ca."
        value={line.amountPrefix}
        onChange={(e) => onChange({ amountPrefix: e.target.value })}
      />
      {/* amount is a string on the wire — "1-2" and "½" are valid */}
      <Input
        aria-label="Menge"
        className="w-20"
        placeholder="400"
        value={line.amount}
        onChange={(e) => onChange({ amount: e.target.value })}
      />
      <Input
        aria-label="Einheit"
        className="w-20"
        placeholder="g"
        value={line.unit}
        onChange={(e) => onChange({ unit: e.target.value })}
      />
      <IngredientPicker
        value={line.ingredient}
        text={line.text}
        onPick={(id) => onChange({ ingredient: id, text: '' })}
        onText={(text) => onChange({ ingredient: null, text })}
      />
      <RowActions
        onUp={onUp}
        onDown={onDown}
        onRemove={onRemove}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        removeLabel="Zutat entfernen"
      />
    </div>
  )
}
