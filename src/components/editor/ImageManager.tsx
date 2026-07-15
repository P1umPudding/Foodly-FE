import { useState } from 'react'
import { Button, Label, toast } from '@postxl/ui-components'
import { Star, Trash2, Upload } from 'lucide-react'
import { foodly } from '../../api'
import { recipeImageSrc } from '../../api/assets'
import type { ImageId } from '../../api/protocol'

// Uploads land in the image store immediately (POST /images), and only the id is
// held in the draft. An image whose recipe is never saved is simply orphaned —
// the backend has no cleanup, and that's an accepted gap.
export function ImageManager({
  mainImage,
  images,
  onChange,
}: {
  mainImage: ImageId | null
  images: ImageId[]
  onChange: (patch: { mainImage?: ImageId | null; images?: ImageId[] }) => void
}) {
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const { id } = await foodly.uploadImage(file)
      if (mainImage === null) onChange({ mainImage: id, images })
      else onChange({ images: [...images, id] })
    } catch (e) {
      toast.error(`Bild konnte nicht hochgeladen werden: ${(e as Error).message}`)
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
            <img src={recipeImageSrc(mainImage)} alt="Hauptbild" className="size-20 rounded-md object-cover" />
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

        {images.map((id) => (
          <figure key={id} className="flex flex-col items-center gap-1">
            <img src={recipeImageSrc(id)} alt="" className="size-20 rounded-md object-cover" />
            <figcaption className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Als Hauptbild"
                onClick={() =>
                  onChange({
                    mainImage: id,
                    images: [...images.filter((i) => i !== id), ...(mainImage === null ? [] : [mainImage])],
                  })
                }
              >
                <Star className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Bild entfernen"
                onClick={() => onChange({ images: images.filter((i) => i !== id) })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </figcaption>
          </figure>
        ))}

        <Label
          htmlFor="image-upload"
          className="grid size-20 cursor-pointer place-items-center rounded-md border border-dashed text-muted-foreground"
        >
          <Upload className="h-5 w-5" />
        </Label>
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Bild hochladen"
          disabled={uploading}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
