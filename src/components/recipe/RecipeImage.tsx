import { forwardRef, useState, type ReactNode } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@postxl/ui-components'
import { recipeImageSrc } from '../../api/assets'
import type { ImageRef } from '../../api/protocol'

// The failure is remembered per src, so switching to another image shows it again without a reset effect.
export function useImageFailed(src: string | null) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return { failed: src !== null && failedSrc === src, onError: () => setFailedSrc(src) }
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
    loading?: 'lazy' | 'eager'
    onClick?: (e: React.MouseEvent<HTMLElement>) => void
    onLoad?: () => void
  }
>(function RecipeImage({ image, alt, className, fallbackClassName, fallback, loading, onClick, onLoad }, ref) {
  const src = recipeImageSrc(image)
  const { failed, onError } = useImageFailed(src)

  if (!failed) {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={loading}
        onClick={onClick}
        onLoad={onLoad}
        onError={onError}
        className={className}
      />
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
