// The small square preview of a recipe in list rows: its main photo, or a grey placeholder with cutlery.
import { UtensilsCrossed } from 'lucide-react'
import { cn } from '@postxl/ui-components'
import type { ImageRef } from '../../api/protocol'
import { RecipeImage } from './RecipeImage'

const SIZES = {
  sm: { box: 'size-9', icon: 'size-[18px]' },
  md: { box: 'h-12 w-12', icon: 'h-5 w-5' },
}

export function RecipeThumb({
  image,
  size,
  testId,
}: {
  image: ImageRef | null
  size: keyof typeof SIZES
  testId?: string
}) {
  const { box, icon } = SIZES[size]
  const noPhoto = <UtensilsCrossed className={cn(icon, 'text-muted-foreground/40')} />
  return (
    <div
      data-testid={testId}
      className={cn(box, 'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted')}
    >
      {image !== null ? (
        // A photo that fails to load looks like no photo at all.
        <RecipeImage image={image} alt="" className="size-full object-cover" fallback={noPhoto} />
      ) : (
        noPhoto
      )}
    </div>
  )
}
