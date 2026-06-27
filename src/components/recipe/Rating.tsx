import { Star } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from '@postxl/ui-components'
import { Stars } from './Stars'
import { visibleRating, ratingsByRole, collaborationState, type RatedRole } from '../../api/views'
import { useCurrentUserId, useUser } from '../../catalog/CatalogProvider'
import { userImageSrc } from '../../api/assets'
import type { Recipe, UserId } from '../../api/protocol'

const ROLE_LABEL: Record<RatedRole, string> = {
  owner: 'Besitzer',
  editor: 'Bearbeiter',
  viewer: 'Betrachter',
  other: 'Weitere',
}

const ROLE_ORDER: RatedRole[] = ['owner', 'editor', 'viewer', 'other']

// Full 5-star bar + number — for the Durchschnitt / Du summary rows. The number
// is fixed-width (tabular, always N.N), so the star bars line up across rows.
function StarsValue({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <Stars value={value} size="xs" />
      {value.toFixed(1)}
    </span>
  )
}

function StarValue({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Star className="h-3.5 w-3.5 fill-current text-star" />
      {value.toFixed(1)}
    </span>
  )
}

function RaterRow({ id, rating, isCurrent }: { id: UserId; rating: number; isCurrent: boolean }) {
  const user = useUser(id)
  const name = user?.name ?? `User ${id}`
  const initial = name.trim().charAt(0).toUpperCase() || '?'
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
  )
}

// Collaboration-aware visibility: private/shared show only the current user's
// own rating; collaborative shows the pooled average plus every rater grouped
// by role. visibleRating() encodes that rule; null means nothing to show.
export function Rating({ recipe }: { recipe: Recipe }) {
  const currentUserId = useCurrentUserId()
  const value = visibleRating(recipe, currentUserId)
  if (value === null) return null

  const collaborative = collaborationState(recipe) === 'collaborative'
  const rows = collaborative ? ratingsByRole(recipe) : []
  const own = currentUserId === null ? undefined : rows.find((r) => r.user === currentUserId)

  return (
    <Popover>
      {/* PopoverTrigger is the library's own ref-forwarding button (the @postxl
          Button doesn't forwardRef, which breaks Radix positioning). cursor-pointer
          is explicit until the lib ships it for interactive elements. */}
      <PopoverTrigger className="inline-flex cursor-pointer items-center rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <Stars value={value} size="md" />
      </PopoverTrigger>
      <PopoverContent className="max-h-[60vh] w-72 overflow-y-auto">
        {collaborative ? (
          <>
            <div className="flex items-center justify-between font-medium">
              <span>
                Durchschnitt <span className="font-normal text-muted-foreground">({rows.length})</span>
              </span>
              <StarsValue value={value} />
            </div>
            {own && (
              <div className="mt-1.5 flex items-center justify-between font-medium">
                <span>Du</span>
                <StarsValue value={own.rating} />
              </div>
            )}

            {ROLE_ORDER.map((role) => {
              const members = rows.filter((r) => r.role === role)
              if (members.length === 0) return null
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
              )
            })}
          </>
        ) : (
          <div className="flex items-center justify-between font-medium">
            <span>Deine Bewertung</span>
            <StarsValue value={value} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
