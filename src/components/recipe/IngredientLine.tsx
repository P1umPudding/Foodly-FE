import { TagText } from '../TagText';
import { ingredientParts } from '../../api/views';
import type { RecipeIngredient } from '../../api/protocol';

// One row of the (visually borderless) ingredient table: quantity right-aligned
// and pale, name left-aligned.
export function IngredientLine({ line }: { line: RecipeIngredient }) {
  const { quantity, name } = ingredientParts(line);
  return (
    <tr>
      <td className="py-1 pr-3 text-right align-baseline text-foreground/70">
        <TagText value={quantity} />
      </td>
      <td className="py-1 align-baseline">
        <TagText value={name} />
      </td>
    </tr>
  );
}
