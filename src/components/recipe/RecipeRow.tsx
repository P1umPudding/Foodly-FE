import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Card } from '@postxl/ui-components';
import { TagText } from '../TagText';
import { averageRating } from '../../api/views';
import type { Recipe } from '../../api/protocol';

export function RecipeRow({ recipe }: { recipe: Recipe }) {
  const avg = averageRating(recipe);
  const initial = recipe.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Link to={`/recipes/${recipe.id}`} className="block">
      <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
        <Avatar className="h-10 w-10 shrink-0">
          {/* recipe.mainImage drives AvatarImage once image loading lands; null in Phase 1 → fallback initial */}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="truncate font-medium"><TagText value={recipe.name} /></span>
            {recipe.tags.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {recipe.tags.map((t) => (
                  <Badge key={t} variant="secondary"><TagText value={t} /></Badge>
                ))}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {avg !== null && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                {avg.toFixed(1)}
              </span>
            )}
            {avg !== null && recipe.time && <span aria-hidden>·</span>}
            {recipe.time && <span>🕒 <TagText value={recipe.time} /></span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
