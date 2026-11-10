import { forwardRef, useState, type ReactNode } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@postxl/ui-components'
import { recipeImageSrc } from '../../api/assets'
import type { ImageRef } from '../../api/protocol'

// Failures are remembered per src: switching to another image shows it again without a reset effect, and
// paging back to a failed one (Lightbox) doesn't retry it and flash a broken image.
export function useImageFailed(src: string | null) {
  const [failedSrcs, setFailedSrcs] = useState<ReadonlySet<string>>(() => new Set())
  return {
    failed: src !== null && failedSrcs.has(src),
    onError: () => {
      if (src !== null) setFailedSrcs((prev) => new Set(prev).add(src))
    },
  }
}

// A recipe image that turns into a placeholder when it can't be loaded, instead of a broken image.
// `className` styles the <img>; `fallbackClassName` sizes the default placeholder (the image's own size
// often doesn't fit it, e.g. w-auto on the detail hero).
export const RecipeImage = forwardRef<
  HTMLImageElement,
  {
    image: ImageRef
    alt: string
    className?: string
    fallbackClassName?: string
    fallback?: ReactNode
    onClick?: (e: React.MouseEvent<HTMLElement>) => void
    onLoad?: () => void
  }
>(function RecipeImage({ image, alt, className, fallbackClassName, fallback, onClick, onLoad }, ref) {
  const src = recipeImageSrc(image)
  const { failed, onError } = useImageFailed(src)

  if (!failed) {
    return (
      <img ref={ref} src={src} alt={alt} onClick={onClick} onLoad={onLoad} onError={onError} className={className} />
    )
  }
  if (fallback !== undefined) return <>{fallback}</>
  return (
    <div
      data-testid="image-fallback"
      onClick={onClick}
      {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
      className={cn('flex items-center justify-center bg-muted text-muted-foreground/40', fallbackClassName)}
    >
      <ImageOff className="size-6" />
    </div>
  )
})
