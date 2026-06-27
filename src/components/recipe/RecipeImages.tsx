import { recipeImageSrc } from '../../api/assets'
import type { ImageId } from '../../api/protocol'

// Image area for the recipe detail view: the main image and the right-edge
// tiles sit next to each other as one group, centred in the row. The hardcoded
// row height drives the geometry: stacked tiles are half of it; a lone extra
// image fills the full height (twice the size of a stacked tile). No backdrop or
// shadow — transparent PNGs just blend onto the page in this view.
const ROW_H = 'h-[400px]'
const GAP = 'gap-3' // one gap everywhere: main↔tiles, between stacked tiles; its px (0.75rem) is baked into the max-width calc below

export function RecipeImages({
  images,
  alt,
  onOpen,
}: {
  images: ImageId[]
  alt: string
  onOpen: (index: number) => void
}) {
  if (images.length === 0) return null

  const [hero, ...rest] = images
  const extra = rest.length

  // The main image fills the row height; its width follows the aspect ratio.
  // Cap that width so [image + gap + tiles] never overflows the row — the tile
  // column and gap are fixed, so this stays a static calc (no measuring).
  const mainMaxW =
    extra === 0 ? 'max-w-full' : extra === 1 ? 'max-w-[calc(100%-392px-0.75rem)]' : 'max-w-[calc(100%-196px-0.75rem)]'

  return (
    <div className={`mt-6 flex justify-center ${GAP} ${ROW_H}`}>
      <img
        src={recipeImageSrc(hero)}
        alt={alt}
        onClick={() => onOpen(0)}
        className={`h-full w-auto ${mainMaxW} cursor-zoom-in rounded-xl object-contain`}
      />

      {/* One extra image → a single tile at full row height (≈ 2× a stacked tile). */}
      {extra === 1 && <Tile id={rest[0]} className="w-[392px] shrink-0" onClick={() => onOpen(1)} />}

      {/* Two or more → two stacked half-height tiles; the second shows "+N" for
          any images beyond the two on display. */}
      {extra >= 2 && (
        <div className={`flex w-[196px] shrink-0 flex-col ${GAP}`}>
          <Tile id={rest[0]} className="min-h-0 flex-1" onClick={() => onOpen(1)} />
          <Tile
            id={rest[1]}
            className="min-h-0 flex-1"
            onClick={() => onOpen(2)}
            overlay={extra > 2 ? `+${extra - 2}` : undefined}
          />
        </div>
      )}
    </div>
  )
}

function Tile({
  id,
  className,
  onClick,
  overlay,
}: {
  id: ImageId
  className: string
  onClick: () => void
  overlay?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative cursor-zoom-in overflow-hidden rounded-xl ${className}`}
    >
      <img src={recipeImageSrc(id)} alt="" className="h-full w-full object-cover" />
      {overlay && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-medium text-white">
          {overlay}
        </span>
      )}
    </button>
  )
}
