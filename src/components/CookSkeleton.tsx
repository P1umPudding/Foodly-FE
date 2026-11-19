// Cook mode while its route loads: the full-screen frame with an empty header and a step placeholder. Mirrors
// CookFrame / CookHeader / StepSkeleton in pages/CookMode.tsx (safe-area paddings included); kept separate because
// the fallback must not load that page. Dedupe once #210 has landed in CookMode.tsx.
import { Skeleton } from './Skeleton'

export function CookSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background px-4 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] pr-[calc(1rem+env(safe-area-inset-right))] pl-[calc(1rem+env(safe-area-inset-left))]">
        <Skeleton className="-ml-2 size-9 rounded-md" />
        <Skeleton className="h-5 w-48 max-w-full" />
      </div>
      <div className="mx-auto w-full max-w-[860px] flex-1 px-10 pt-[8vh] pb-10 lg:px-14 phone:px-5 phone:pt-7">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-3 h-9 w-full" />
        <Skeleton className="mt-2 h-9 w-4/5" />
        <Skeleton className="mt-10 h-4 w-1/2" />
      </div>
    </div>
  )
}
