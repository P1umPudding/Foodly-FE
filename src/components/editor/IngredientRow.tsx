import { useId } from 'react'
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
  const isCatalog = line.ingredient !== null
  const zusatzHintId = useId()

  return (
    // Wraps on narrow screens: with the Zusatz column the fixed-width fields alone exceed a phone's width.
    <div className="flex flex-wrap items-center gap-2">
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
        // Catalog swap keeps the Zusatz; a free-text name must not become the Zusatz of the picked ingredient.
        onPick={(id) => onChange({ ingredient: id, text: isCatalog ? line.text : '' })}
        onText={(text) => onChange({ ingredient: null, text })}
      />
      {/* Free text keeps its whole name in `text` (nothing is split), so there is no Zusatz to edit. */}
      <Input
        aria-label="Zusatz"
        className="w-32"
        placeholder={isCatalog ? 'z. B. gehackt' : undefined}
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
