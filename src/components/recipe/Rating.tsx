import { Star } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from '@postxl/ui-components';
import { Stars } from './Stars';
import { averageRating, ratingsByRole, type RatedRole } from '../../api/views';
import { useCurrentUserId, useUser } from '../../catalog/CatalogProvider';
import { userImageSrc } from '../../api/assets';
import type { Recipe, UserId } from '../../api/protocol';

const ROLE_LABEL: Record<RatedRole, string> = {
  owner: 'Besitzer',
  editor: 'Bearbeiter',
  viewer: 'Betrachter',
  other: 'Weitere',
};

const ROLE_ORDER: RatedRole[] = ['owner', 'editor', 'viewer', 'other'];

function StarValue({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Star className="h-3.5 w-3.5 fill-current text-star" />
      {value.toFixed(1)}
    </span>
  );
}

function RaterRow({ id, rating, isCurrent }: { id: UserId; rating: number; isCurrent: boolean }) {
  const user = useUser(id);
  const name = user?.name ?? `User ${id}`;
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Avatar className="h-6 w-6 shrink-0">
          {user?.profilePicture && <AvatarImage src={userImageSrc(user.profilePicture)} alt="" />}
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        <span className="truncate">
          {name}
          {isCurrent && <span className="text-muted-foreground"> (Du)</span>}
        </span>
      </span>
      <span className="shrink-0 text-muted-foreground">
        <StarValue value={rating} />
      </span>
    </li>
  );
}

export function Rating({ recipe }: { recipe: Recipe }) {
  const avg = averageRating(recipe);
  const currentUserId = useCurrentUserId();
  if (avg === null) return null;

  const rows = ratingsByRole(recipe);
  const own = currentUserId === null ? undefined : rows.find((r) => r.user === currentUserId);

  return (
    <Popover>
      {/* PopoverTrigger is the library's own ref-forwarding button (the @postxl
          Button doesn't forwardRef, which breaks Radix positioning). cursor-pointer
          is explicit until the lib ships it for interactive elements. */}
      <PopoverTrigger className="inline-flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <Stars value={avg} size="md" />
        <span className="tabular-nums">{avg.toFixed(1)}</span>
      </PopoverTrigger>
      <PopoverContent className="max-h-[60vh] w-72 overflow-y-auto">
        <div className="flex items-center justify-between font-medium">
          <span>Durchschnitt</span>
          <StarValue value={avg} />
          <span className="sr-only">aus {rows.length} Bewertungen</span>
        </div>
        {own && (
          <div className="mt-1 flex items-center justify-between font-medium">
            <span>Du</span>
            <StarValue value={own.rating} />
          </div>
        )}

        {ROLE_ORDER.map((role) => {
          const members = rows.filter((r) => r.role === role);
          if (members.length === 0) return null;
          return (
            <div key={role}>
              <Separator className="my-3" />
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {ROLE_LABEL[role]}
              </p>
              <ul className="space-y-1.5">
                {members.map((r) => (
                  <RaterRow key={r.user} id={r.user} rating={r.rating} isCurrent={r.user === currentUserId} />
                ))}
              </ul>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
