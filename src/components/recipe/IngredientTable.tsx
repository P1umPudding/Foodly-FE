import { IngredientLine } from './IngredientLine'
import type { RecipeIngredient, RecipeIngredientId } from '../../api/protocol'

// The ingredient rows of one section, shared by the detail page and the cook mode's ingredient column.
export function IngredientTable({
  ingredients,
  factor = 1,
  checkable = false,
  checkedIds,
  onToggle,
  quantityClassName = 'w-24',
}: {
  ingredients: RecipeIngredient[]
  factor?: number
  checkable?: boolean
  checkedIds?: ReadonlySet<RecipeIngredientId>
  onToggle?: (id: RecipeIngredientId) => void
  // Under table-fixed the width includes the cell's pr-3: the default is 84 px content plus a 12 px gap.
  quantityClassName?: string
}) {
  return (
    // border-collapse is what lets the rows draw their hairlines.
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        {checkable && <col className="w-8" />}
        <col className={quantityClassName} />
        <col />
      </colgroup>
      <tbody>
        {ingredients.map((line) => (
          <IngredientLine
            key={line.id}
            line={line}
            factor={factor}
            checkable={checkable}
            checked={checkedIds?.has(line.id) ?? false}
            onToggle={onToggle}
          />
        ))}
      </tbody>
    </table>
  )
}
