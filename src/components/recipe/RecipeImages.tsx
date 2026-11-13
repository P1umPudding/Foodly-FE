import { cn } from '@postxl/ui-components'
import { RecipeImage } from './RecipeImage'
import { TriggerButton } from '../TriggerButton'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import type { ImageRef } from '../../api/protocol'

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

// The gallery below the sections: all images in viewer order (the main image too), in one row of square tiles.
// `onOpen` gets the index within `images`, i.e. the lightbox index. A single image is already the hero, so no gallery.
export function RecipeImages({ images, onOpen }: { images: ImageRef[]; onOpen: (index: number) => void }) {
  const slots = useIsDesktop() ? 4 : 3
  if (images.length < 2) return null

  const visible = images.slice(0, slots)
  // The last tile still shows its own image under "+N", so it counts among the ones the number stands for.
  const more = images.length > slots ? images.length - slots + 1 : 0

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Fotos</h2>
        <span className="text-sm tabular-nums text-muted-foreground">{images.length}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 phone:grid-cols-3">
        {visible.map((image, i) => {
          const isMore = more > 0 && i === visible.length - 1
          return (
            <TriggerButton
              key={`${image.id}-${i}`}
              variant="bare"
              onClick={() => onOpen(i)}
              // The image itself is decorative (alt=""), so the button carries the name.
              aria-label={isMore ? `Alle ${images.length} Fotos ansehen` : `Foto ${i + 1} groß ansehen`}
              className={cn(
                'relative aspect-square cursor-zoom-in overflow-hidden rounded-lg focus-visible:ring-ring',
                BACKDROP,
              )}
            >
              <RecipeImage
                image={image}
                alt=""
                className="h-full w-full object-cover"
                fallbackClassName="h-full w-full"
              />
              {isMore && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 grid place-items-center bg-black/50 text-xl font-semibold tabular-nums text-white"
                >
                  +{more}
                </span>
              )}
            </TriggerButton>
          )
        })}
      </div>
    </div>
  )
}
