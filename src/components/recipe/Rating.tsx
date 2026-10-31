import { useId, useState } from 'react'
import { Star } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  cn,
} from '@postxl/ui-components'
import { Stars } from './Stars'
import { DemoHint } from '../DemoHint'
import { foodly } from '../../api'
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

// Full 5-star bar + number for the Durchschnitt row; tabular N.N keeps the
// width stable.
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

// Editable own rating, shown in every collaboration mode. Re-clicking the
// current star is a no-op; removing is the explicit button.
function MyRatingInput({ recipe, onChange }: { recipe: Recipe; onChange?: (recipe: Recipe) => void }) {
  const currentUserId = useCurrentUserId()
  const own = currentUserId === null ? null : (recipe.rating.find((r) => r.user === currentUserId)?.rating ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const disabled = saving || currentUserId === null
  const labelId = useId()

  const save = async (write: () => Promise<Recipe>) => {
    setSaving(true)
    setError(null)
    try {
      onChange?.(await write())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-medium">
        <span id={labelId}>Deine Bewertung</span>
        <span role="group" aria-labelledby={labelId} className="inline-flex items-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              variant="ghost"
              size="iconSm"
              aria-label={`${n} von 5`}
              aria-pressed={own === n}
              disabled={disabled}
              onClick={() => n !== own && save(() => foodly.setMyRating(recipe.id, n))}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  own !== null && n <= own ? 'fill-current text-star' : 'text-muted-foreground/40',
                )}
              />
            </Button>
          ))}
        </span>
      </div>
      {/* Stays mounted (disabled when unrated) so focus isn't dropped after removing. */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || own === null}
          onClick={() => save(() => foodly.clearMyRating(recipe.id))}
        >
          Entfernen
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <DemoHint feature="ratings" />
    </div>
  )
}

// Collaboration-aware visibility: private/shared show only the current user's
// own rating; collaborative shows the pooled average plus every rater grouped
// by role. visibleRating() encodes that rule.
function RatingDetails({
  recipe,
  value,
  onChange,
}: {
  recipe: Recipe
  value: number | null
  onChange?: (recipe: Recipe) => void
}) {
  const currentUserId = useCurrentUserId()
  const collaborative = collaborationState(recipe) === 'collaborative'
  const rows = collaborative ? ratingsByRole(recipe) : []

  return (
    <>
      {collaborative && value !== null && (
        <div className="mb-1.5 flex items-center justify-between font-medium">
          <span>
            Durchschnitt <span className="font-normal text-muted-foreground">({rows.length})</span>
          </span>
          <StarsValue value={value} />
        </div>
      )}

      <MyRatingInput recipe={recipe} onChange={onChange} />

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
  )
}

// Always rendered, so an unrated recipe still offers a way to give the first rating.
export function Rating({ recipe, onChange }: { recipe: Recipe; onChange?: (recipe: Recipe) => void }) {
  const value = visibleRating(recipe, useCurrentUserId())

  return (
    <Popover>
      {/* PopoverTrigger is the library's own ref-forwarding button (the @postxl
          Button doesn't forwardRef, which breaks Radix positioning). cursor-pointer
          is explicit until the lib ships it for interactive elements. */}
      <PopoverTrigger
        aria-label={value === null ? 'Bewerten' : `Bewertung ${value.toFixed(1).replace('.', ',')} von 5`}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span aria-hidden className="inline-flex">
          <Stars value={value ?? 0} size="md" />
        </span>
        {value === null && <span className="text-sm text-muted-foreground">Bewerten</span>}
      </PopoverTrigger>
      <PopoverContent className="max-h-[60vh] w-72 overflow-y-auto">
        <RatingDetails recipe={recipe} value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
