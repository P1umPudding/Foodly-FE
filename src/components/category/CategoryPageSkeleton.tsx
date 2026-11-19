// A category page before its category is known: the tinted head and the first cards. Outside CategoryPage.tsx so the
// lazy route's fallback can show it.
import { Skeleton } from '../Skeleton'
import { ListSkeleton } from '../list/ListSkeleton'

export function CategoryPageSkeleton({ headTestId }: { headTestId?: string }) {
  return (
    <>
      <Skeleton data-testid={headTestId} className="h-24 w-full rounded-lg phone:h-20" />
      <div className="pt-6">
        <ListSkeleton detail="detailed" count={4} />
      </div>
    </>
  )
}
