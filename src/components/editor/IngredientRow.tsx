import { useId } from 'react'
import { Input } from '@postxl/ui-components'
import { ChevronDown } from 'lucide-react'
import { IngredientPicker } from './IngredientPicker'
import { RowMenu } from './RowMenu'
import { SuggestInput } from './SuggestInput'
import type { DraftIngredient } from '../../editor/draft'

// Columns of mockup `.ed-ing`/`.ed-ing-head`: Menge · Einheit · Zutat · Zusatz · ⋮. No grip column: drag & drop isn't
// implemented. Shared with the header so both stay aligned, also with the wider touch menu (design.md §7). On the phone
// the row wraps instead (the reading rows and the edit sheet for phones are #217).
export const INGREDIENT_COLUMNS =
  'grid grid-cols-[96px_90px_minmax(0,1fr)_minmax(0,0.7fr)_30px] items-center gap-1.5 touch:grid-cols-[96px_90px_minmax(0,1fr)_minmax(0,0.7fr)_40px]'

// Suggestions only: unit is free text on the wire, and recipes already use units like "Dose" or "Bund".
const UNITS = ['g', 'kg', 'ml', 'l', 'EL', 'TL', 'Prise', 'Stück', 'Dose', 'Bund']

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
  const unit = line.unit.trim().toLowerCase()

  return (
    <div className={`${INGREDIENT_COLUMNS} phone:flex phone:flex-wrap`}>
      {/* amount is a string on the wire: "1-2" and "½" are valid, and the prefix ("ca.") is typed in here too */}
      <Input
        aria-label="Menge"
        className="tabular-nums phone:w-24"
        placeholder="Menge"
        value={line.amount}
        onChange={(e) => onChange({ amount: e.target.value })}
      />
      <SuggestInput
        label="Einheit"
        placeholder="Einheit"
        className="phone:w-24"
        icon={<ChevronDown className="size-4" />}
        value={line.unit}
        onValueChange={(value) => onChange({ unit: value })}
        suggestions={UNITS.filter((u) => u.toLowerCase().startsWith(unit) && u.toLowerCase() !== unit).map((u) => ({
          id: u,
          label: u,
        }))}
        onSelect={(value) => onChange({ unit: value })}
      />
      <IngredientPicker
        className="phone:min-w-40 phone:flex-1"
        value={line.ingredient}
        text={line.text}
        // Catalog swap keeps the Zusatz; a free-text name must not become the Zusatz of the picked ingredient.
        onPick={(id) => onChange({ ingredient: id, text: isCatalog ? line.text : '' })}
        onText={(text) => onChange({ ingredient: null, text })}
      />
      {/* Free text keeps its whole name in `text` (nothing is split), so there is no Zusatz to edit. */}
      <Input
        aria-label="Zusatz"
        className="phone:w-32"
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
