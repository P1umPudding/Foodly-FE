// Placeholder rows of „Meine Kategorien“. Outside Categories.tsx so the lazy route's fallback can show it.
import { Card, cn } from '@postxl/ui-components'
import { Skeleton } from '../Skeleton'
import { ROW_DIVIDER } from '../rowDivider'

// Mockup `.pad-rows > .row` in a `.divided` card.
export const CATEGORY_ROW = cn('flex items-center gap-3.5 rounded-sm px-3 py-2.5', ROW_DIVIDER)

export function CategoryRowsSkeleton() {
  return (
    <Card className="gap-0 p-1">
      {[0, 1, 2].map((i) => (
        <div key={i} data-testid="category-row-skeleton" className={CATEGORY_ROW}>
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </Card>
  )
}
