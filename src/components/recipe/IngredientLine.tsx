import { Checkbox, cn } from '@postxl/ui-components'
import { TagText } from '../TagText'
import { ingredientParts, isScalableAmount, scaleAmount } from '../../api/views'
import type { RecipeIngredient, RecipeIngredientId } from '../../api/protocol'

// One row of the ingredient table: quantity right-aligned and muted, name left-aligned, a hairline below. In Koch-Modus
// the amount is scaled by `factor` and an optional leading check-off cell is rendered.
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
  // Without the hint an amount like "etwas" looks scaled next to the scaled rows.
  const unscaled = factor !== 1 && Boolean(line.amount?.trim()) && !isScalableAmount(line.amount)

  // Dim via row opacity so both text cells fade uniformly regardless of their own colour utilities.
  const dim = checkable && checked ? 'line-through opacity-50' : undefined

  return (
    <tr className="border-b">
      {checkable && (
        <td className="py-[7px] pr-2 align-baseline">
          <Checkbox
            checked={checked}
            onChange={() => onToggle?.(line.id)}
            aria-label={name || 'Zutat'}
            className="translate-y-0.5"
          />
        </td>
      )}
      <td className={cn('py-[7px] pr-3 text-right align-baseline text-muted-foreground', dim)}>
        <TagText value={quantity} />
      </td>
      <td className={cn('py-[7px] align-baseline', dim)}>
        {line.ingredient && line.text?.trim() ? (
          <>
            <TagText value={line.ingredient.name} />{' '}
            <span className="text-muted-foreground">
              <TagText value={line.text} />
            </span>
          </>
        ) : (
          <TagText value={name} />
        )}
        {/* text-muted-foreground, not subtle: subtle at text-xs falls below 4.5:1. */}
        {unscaled && (
          <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
            <span className="sr-only">Menge </span>nicht skaliert
          </span>
        )}
      </td>
    </tr>
  )
}
