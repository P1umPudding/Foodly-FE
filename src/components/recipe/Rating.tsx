import { Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, Separator, Button } from '@postxl/ui-components';
import { Stars } from './Stars';
import { visibleRating, ratingsByRole, collaborationState, type RatedRole } from '../../api/views';
import { useCurrentUserId, useUser } from '../../catalog/CatalogProvider';
import type { Recipe, UserId } from '../../api/protocol';

const ROLE_LABEL: Record<RatedRole, string> = {
  owner: 'Besitzer', editor: 'Bearbeiter', viewer: 'Betrachter', other: 'Weitere',
};

function UserName({ id }: { id: UserId }) {
  const user = useUser(id);
  return <>{user?.name ?? `User ${id}`}</>;
}

export function Rating({ recipe }: { recipe: Recipe }) {
  const currentUserId = useCurrentUserId();
  const value = visibleRating(recipe, currentUserId);
  if (value === null) return null;

  const collaborative = collaborationState(recipe) === 'collaborative';
  const rows = collaborative ? ratingsByRole(recipe) : [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto gap-1.5 px-1.5 py-0.5">
          <Stars value={value} />
          <span className="text-sm tabular-nums text-muted-foreground">{value.toFixed(1)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        {collaborative ? (
          <>
            <div className="flex items-center justify-between">
              <span className="font-medium">Bewertungen</span>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-current text-star" />
                {value.toFixed(1)} · {rows.length}
              </span>
            </div>
            <Separator className="my-3" />
            <ul className="space-y-1">
              {rows.map((rrow) => (
                <li key={rrow.user} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <UserName id={rrow.user} />
                    <span className="text-xs text-muted-foreground">{ROLE_LABEL[rrow.role]}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-current text-star" />
                    {rrow.rating.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Deine Bewertung</span>
            <span className="inline-flex items-center gap-1 text-sm tabular-nums">
              <Star className="h-3.5 w-3.5 fill-current text-star" />
              {value.toFixed(1)}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
