import { useState } from 'react'
import { Button, Label, toast } from '@postxl/ui-components'
import { Star, Trash2, Upload } from 'lucide-react'
import { foodly } from '../../api'
import { errorMessage } from '../../lib/errorMessage'
import { RecipeImage } from '../recipe/RecipeImage'
import type { ImageRef } from '../../api/protocol'

// Uploads land in the image store immediately (POST /images); the draft holds the
// returned ref and only its id goes out on save. An image whose recipe is never saved is simply orphaned —
// the backend has no cleanup, and that's an accepted gap.
export function ImageManager({
  mainImage,
  images,
  onChange,
}: {
  mainImage: ImageRef | null
  images: ImageRef[]
  onChange: (patch: { mainImage?: ImageRef | null; images?: ImageRef[] }) => void
}) {
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const image = await foodly.uploadImage(file)
      if (mainImage === null) onChange({ mainImage: image, images })
      else onChange({ images: [...images, image] })
    } catch (e) {
      toast.error(`Bild konnte nicht hochgeladen werden: ${errorMessage(e, 'unbekannter Fehler')}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Bilder</Label>
      <div className="flex flex-wrap items-start gap-3">
        {mainImage !== null && (
          <figure className="flex flex-col items-center gap-1">
            <RecipeImage
              image={mainImage}
              alt="Hauptbild"
              className="size-20 rounded-md object-cover"
              fallbackClassName="size-20 rounded-md"
            />
            <figcaption className="flex items-center gap-1 text-muted-foreground">
              <Star className="h-3 w-3 fill-star text-star" />
              Hauptbild
              <Button
                variant="ghost"
                size="sm"
                aria-label="Hauptbild entfernen"
                onClick={() => onChange({ mainImage: null })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </figcaption>
          </figure>
        )}

        {images.map((image) => (
          <figure key={image.id} className="flex flex-col items-center gap-1">
            <RecipeImage
              image={image}
              alt=""
              className="size-20 rounded-md object-cover"
              fallbackClassName="size-20 rounded-md"
            />
            <figcaption className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Als Hauptbild"
                onClick={() =>
                  onChange({
                    mainImage: image,
                    images: [...images.filter((i) => i.id !== image.id), ...(mainImage === null ? [] : [mainImage])],
                  })
                }
              >
                <Star className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Bild entfernen"
                onClick={() => onChange({ images: images.filter((i) => i.id !== image.id) })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </figcaption>
          </figure>
        ))}

        {/* eslint-disable-next-line react/forbid-elements -- native file picker, @postxl/ui-components has no file input */}
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Bild hochladen"
          disabled={uploading}
          className="peer hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
        {/* After the input: peer-disabled dims the tile while uploading or while the editor is locked. */}
        <Label
          htmlFor="image-upload"
          className="grid size-20 cursor-pointer place-items-center rounded-md border border-dashed text-muted-foreground peer-disabled:pointer-events-none peer-disabled:opacity-50"
        >
          <Upload className="h-5 w-5" />
        </Label>
      </div>
    </div>
  )
}
