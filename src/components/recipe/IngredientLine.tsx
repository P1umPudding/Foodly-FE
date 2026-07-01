import { Checkbox, cn } from '@postxl/ui-components'
import { TagText } from '../TagText'
import { ingredientParts, scaleAmount } from '../../api/views'
import type { RecipeIngredient, RecipeIngredientId } from '../../api/protocol'

// One row of the (visually borderless) ingredient table: quantity right-aligned
// and pale, name left-aligned. In Koch-Modus the amount is scaled by `factor` and
// an optional leading check-off cell is rendered.
export function IngredientLine({
  line,
  factor = 1,
  checkable = false,
  checked = false,
  onToggle,
}: {
  line: RecipeIngredient
  factor?: number
  checkable?: boolean
  checked?: boolean
  onToggle?: (id: RecipeIngredientId) => void
}) {
  const { quantity, name } = ingredientParts({ ...line, amount: scaleAmount(line.amount, factor) })

  // Dim via row opacity so both text cells fade uniformly regardless of their own
  // colour utilities (the quantity cell is already text-foreground/75).
  const dim = checkable && checked ? 'line-through opacity-50' : undefined

  return (
    <tr>
      {checkable && (
        <td className="py-1 pr-2 align-baseline">
          <Checkbox
            checked={checked}
            onChange={() => onToggle?.(line.id)}
            aria-label={name || 'Zutat'}
            className="translate-y-0.5"
          />
        </td>
      )}
      <td className={cn('py-1 pr-3 text-right align-baseline text-foreground/75', dim)}>
        <TagText value={quantity} />
      </td>
      <td className={cn('py-1 align-baseline', dim)}>
        <TagText value={name} />
      </td>
    </tr>
  )
}
