import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Card } from '@postxl/ui-components';
import { TagText } from '../TagText';
import { RoleCollabIndicator } from './RoleCollabIndicator';
import { visibleRating } from '../../api/views';
import { useCurrentUserId } from '../../catalog/CatalogProvider';
import type { Recipe } from '../../api/protocol';

export function RecipeRow({ recipe, compact = false }: { recipe: Recipe; compact?: boolean }) {
  const rating = visibleRating(recipe, useCurrentUserId());
  const initial = recipe.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Link to={`/recipes/${recipe.id}`} className="block">
      <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
        {!compact && (
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        )}
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
            {rating !== null && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="h-3.5 w-3.5 fill-current text-star" />
                {rating.toFixed(1)}
              </span>
            )}
            {rating !== null && recipe.time && <span aria-hidden>·</span>}
            {recipe.time && <span>🕒 <TagText value={recipe.time} /></span>}
            <span className="ml-auto"><RoleCollabIndicator recipe={recipe} /></span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
