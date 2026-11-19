// Placeholder rows of „Meine Kategorien“. Outside Categories.tsx so the lazy route's fallback can show it.
import { Card, cn } from '@postxl/ui-components'
import { Skeleton } from '../Skeleton'
import { ROW_DIVIDER } from '../rowDivider'

// Mockup `.pad-rows > .row` in a `.divided` card.
export const CATEGORY_ROW = cn('flex items-center gap-3.5 rounded-sm px-3 py-2.5', ROW_DIVIDER)

// The test id is the page's, so a test can't mistake the route fallback for the page's own loading state.
export function CategoryRowsSkeleton({ rowTestId }: { rowTestId?: string }) {
  return (
    <Card className="gap-0 p-1">
      {[0, 1, 2].map((i) => (
        <div key={i} data-testid={rowTestId} className={CATEGORY_ROW}>
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </Card>
  )
}

// The whole „Meine Kategorien“ column while the page itself loads: heading, intro line, rows.
export function CategoriesSkeleton() {
  return (
    <div className="flex max-w-[640px] flex-col gap-3">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-full" />
      <CategoryRowsSkeleton />
    </div>
  )
}
