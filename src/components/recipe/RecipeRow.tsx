import { Link } from 'react-router-dom';
import { Star, Clock, UtensilsCrossed } from 'lucide-react';
import { Card } from '@postxl/ui-components';
import { TagText } from '../TagText';
import { TagChips } from './TagChips';
import { averageRating } from '../../api/views';
import { recipeImageSrc } from '../../api/assets';
import type { Recipe } from '../../api/protocol';

export function RecipeRow({ recipe }: { recipe: Recipe }) {
  const avg = averageRating(recipe);

  return (
    <Link to={`/recipes/${recipe.id}`} className="block">
      <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {recipe.mainImage !== null ? (
            <img src={recipeImageSrc(recipe.mainImage)} alt="" className="h-full w-full object-cover" />
          ) : (
            // No own background → the row's hover background shows through.
            <UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="truncate font-medium"><TagText value={recipe.name} /></span>
            <TagChips tags={recipe.tags} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {avg !== null && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="h-4 w-4 fill-current text-star" />
                {avg.toFixed(1)}
              </span>
            )}
            {recipe.time && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <TagText value={recipe.time} />
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
