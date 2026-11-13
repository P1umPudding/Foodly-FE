import { RecipeImage } from './RecipeImage'
import { TriggerButton } from '../TriggerButton'
import { imageName } from '../../api/assets'
import type { ImageRef } from '../../api/protocol'
import { cn } from '@postxl/ui-components'

// Images get a muted backdrop so transparent PNGs don't show the page through them.
const BACKDROP = 'bg-foreground/5 dark:bg-muted'

// The detail head's main image: 4:3, opens the lightbox at the first image.
export function RecipeHero({
  image,
  alt,
  onOpen,
  className,
}: {
  image: ImageRef
  alt: string
  onOpen: () => void
  className?: string
}) {
  return (
    <TriggerButton
      variant="bare"
      onClick={onOpen}
      aria-label="Foto groß ansehen"
      className={cn(
        'block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-lg focus-visible:ring-ring',
        BACKDROP,
        className,
      )}
    >
      <RecipeImage
        image={image}
        alt={image.name ?? alt}
        className="h-full w-full object-cover"
        fallbackClassName="aspect-[4/3] h-full w-full"
      />
    </TriggerButton>
  )
}

// The other images below the head, every one as a square tile. A stopgap until the one-row gallery (R3);
// `onOpen` gets the index within `images`.
export function RecipeImages({ images, onOpen }: { images: ImageRef[]; onOpen: (index: number) => void }) {
  if (images.length === 0) return null

  return (
    <div className="mt-6 grid grid-cols-4 gap-2 phone:grid-cols-3">
      {images.map((image, i) => (
        <TriggerButton
          key={`${image.id}-${i}`}
          variant="bare"
          onClick={() => onOpen(i)}
          // The image itself is decorative (alt=""), so the button carries the name.
          aria-label={imageName(image)}
          className={cn(
            'relative aspect-square cursor-zoom-in overflow-hidden rounded-lg focus-visible:ring-ring',
            BACKDROP,
          )}
        >
          <RecipeImage image={image} alt="" className="h-full w-full object-cover" fallbackClassName="h-full w-full" />
        </TriggerButton>
      ))}
    </div>
  )
}
