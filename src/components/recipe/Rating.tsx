import { Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, Separator } from '@postxl/ui-components';
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

const ROLE_ORDER: RatedRole[] = ['owner', 'editor', 'viewer', 'other'];

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
      {/* The library's Button doesn't forwardRef, so `PopoverTrigger asChild`
          + Button leaves Radix without an anchor (popover renders off-screen).
          Use the trigger's own ref-forwarding button and style it directly. */}
      <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <Stars value={avg} />
        <span className="tabular-nums">{avg.toFixed(1)}</span>
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

        {/* One labelled group per role, each preceded by a separator. */}
        {ROLE_ORDER.map((role) => {
          const members = rows.filter((r) => r.role === role);
          if (members.length === 0) return null;
          return (
            <div key={role}>
              <Separator className="my-3" />
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {ROLE_LABEL[role]}
              </p>
              <ul className="space-y-1">
                {members.map((r) => (
                  <li key={r.user} className="flex items-center justify-between text-sm">
                    <UserName id={r.user} />
                    <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-current text-star" />
                      {r.rating.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
