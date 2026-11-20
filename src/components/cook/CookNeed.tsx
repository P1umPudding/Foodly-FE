// „Dafür“ below the step (#210): the ingredients of the step's section as chips with scaled amounts. The model knows
// no step-to-ingredient link (design spec, decision 4), so it is the whole section. No visible heading (mockup).
import { cn } from '@postxl/ui-components'
import { TagText } from '../TagText'
import { ingredientParts, scaleAmount } from '../../api/views'
import type { RecipeIngredient, RecipeIngredientId } from '../../api/protocol'

export function CookNeed({
  ingredients,
  factor,
  checkedIds,
}: {
  ingredients: RecipeIngredient[]
  factor: number
  checkedIds: ReadonlySet<RecipeIngredientId>
}) {
  if (ingredients.length === 0) return null
  return (
    // role: Safari drops list semantics from a list-style: none list.
    <ul role="list" aria-label="Dafür" className="flex flex-wrap gap-2">
      {ingredients.map((line) => {
        const { quantity, name } = ingredientParts({ ...line, amount: scaleAmount(line.amount, factor) })
        const checked = checkedIds.has(line.id)
        return (
          <li
            key={line.id}
            className={cn(
              'inline-flex h-[30px] max-w-full min-w-0 items-center rounded-sm bg-tag px-3 text-base font-medium text-muted-foreground',
              checked && 'line-through opacity-50',
            )}
          >
            <span className="truncate">
              {quantity && (
                <>
                  <TagText value={quantity} />{' '}
                </>
              )}
              <TagText value={name} />
              {checked && <span className="sr-only"> (abgehakt)</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
