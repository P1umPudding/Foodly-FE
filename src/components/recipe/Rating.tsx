import { Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, Separator, Button } from '@postxl/ui-components';
import { Stars } from './Stars';
import { averageRating, ratingsByRole, type RatedRole } from '../../api/views';
import { useCurrentUserId, useUser } from '../../catalog/CatalogProvider';
import type { Recipe, UserId } from '../../api/protocol';

const ROLE_LABEL: Record<RatedRole, string> = {
  owner: 'Besitzer',
  editor: 'Bearbeiter',
  viewer: 'Betrachter',
  other: 'Weitere',
};

function UserName({ id }: { id: UserId }) {
  const user = useUser(id);
  return <>{user?.name ?? `User ${id}`}</>;
}

export function Rating({ recipe }: { recipe: Recipe }) {
  const avg = averageRating(recipe);
  const currentUserId = useCurrentUserId();
  if (avg === null) return null;

  const rows = ratingsByRole(recipe);
  const own = currentUserId === null ? undefined : rows.find((r) => r.user === currentUserId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto gap-1.5 px-1.5 py-0.5">
          <Stars value={avg} />
          <span className="text-sm tabular-nums text-muted-foreground">{avg.toFixed(1)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex items-center justify-between">
          <span className="font-medium">Bewertungen</span>
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-current text-star" />
            {avg.toFixed(1)} · {rows.length}
          </span>
        </div>

        {own && (
          <div className="mt-3 flex items-center justify-between rounded-md bg-muted px-2 py-1.5">
            <span className="text-sm font-medium">Du</span>
            <span className="inline-flex items-center gap-1 text-sm tabular-nums">
              <Star className="h-3.5 w-3.5 fill-current text-star" />
              {own.rating.toFixed(1)}
            </span>
          </div>
        )}

        <Separator className="my-3" />

        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.user} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <UserName id={r.user} />
                <span className="text-xs text-muted-foreground">{ROLE_LABEL[r.role]}</span>
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-current text-star" />
                {r.rating.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
