// The editor's two columns while the recipe (or the editor itself) loads (design.md §5: a skeleton in the shape of
// the content). Outside RecipeEditor.tsx so the lazy route's fallback can show it without loading the page.
import type { ComponentProps } from 'react'
import { cn } from '@postxl/ui-components'
import { Skeleton } from '../Skeleton'

export function EditorSkeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_280px] items-start gap-8 phone:flex phone:flex-col phone:gap-5',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-[18px]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="flex flex-col gap-[22px] phone:order-first">
        <Skeleton className="aspect-[4/3] w-full phone:aspect-video" />
        <Skeleton className="h-16 w-full phone:hidden" />
      </div>
    </div>
  )
}
