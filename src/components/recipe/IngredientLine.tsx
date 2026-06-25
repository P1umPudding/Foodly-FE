import { TagText } from '../TagText';
import { formatIngredient } from '../../api/views';
import type { RecipeIngredient } from '../../api/protocol';

export function IngredientLine({ line }: { line: RecipeIngredient }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden className="text-muted-foreground">•</span>
      <span><TagText value={formatIngredient(line)} /></span>
    </li>
  );
}
