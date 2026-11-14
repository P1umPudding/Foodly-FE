import { useRef, useState, type ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  Spinner,
  cn,
  toast,
} from '@postxl/ui-components'
import { ImageIcon, Plus, Star, Trash2 } from 'lucide-react'
import { foodly } from '../../api'
import { errorMessage } from '../../lib/errorMessage'
import { RecipeImage } from '../recipe/RecipeImage'
import { TriggerButton } from '../TriggerButton'
import type { ImageRef } from '../../api/protocol'

// Dims an upload tile while the (hidden) file input is disabled: uploading, or the editor locked during Anlegen.
const TILE =
  'cursor-pointer border border-dashed border-input text-muted-foreground hover:bg-hover group-has-[input:disabled]/images:pointer-events-none group-has-[input:disabled]/images:opacity-50 group-has-[input:focus-visible]/images:border-ring group-has-[input:focus-visible]/images:ring-[3px] group-has-[input:focus-visible]/images:ring-ring/50'

// Uploads land in the image store immediately (POST /images); the draft holds the
// returned ref and only its id goes out on save. An image whose recipe is never saved is simply orphaned —
// the backend has no cleanup, and that's an accepted gap.
export function ImageManager({
  mainImage,
  images,
  onChange,
  onAdd,
  onUploadingChange,
}: {
  mainImage: ImageRef | null
  images: ImageRef[]
  onChange: (patch: { mainImage?: ImageRef | null; images?: ImageRef[] }) => void
  // Applied to the current draft (not these props), so several uploads in a row don't overwrite each other.
  onAdd: (image: ImageRef) => void
  // The editor holds "Fertig"/"Anlegen" while uploads run: leaving earlier would drop the photos still on their way.
  onUploadingChange?: (uploading: boolean) => void
}) {
  const [uploading, setUploadingState] = useState(false)
  const setUploading = (next: boolean) => {
    setUploadingState(next)
    onUploadingChange?.(next)
  }
  const inputRef = useRef<HTMLInputElement>(null)
  // After "Entfernen" the menu's trigger is gone; focus goes to the file input instead of the page.
  const focusUpload = (e: Event) => {
    e.preventDefault()
    inputRef.current?.focus()
  }

  // One after another, in the order picked: the first becomes the main image, and a failure keeps the rest.
  const upload = async (files: File[]) => {
    setUploading(true)
    for (const file of files) {
      try {
        onAdd(await foodly.uploadImage(file))
      } catch (e) {
        toast.error(`Bild konnte nicht hochgeladen werden: ${errorMessage(e, 'unbekannter Fehler')}`)
      }
    }
    setUploading(false)
  }

  const hasImages = mainImage !== null || images.length > 0

  return (
    <div className="group/images flex flex-col">
      {/* eslint-disable-next-line react/forbid-elements -- native file picker, @postxl/ui-components has no file input */}
      <input
        ref={inputRef}
        id="image-upload"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        aria-label="Bild hochladen"
        disabled={uploading}
        // sr-only, not hidden: the input stays reachable by Tab; the tiles below show its focus.
        className="sr-only"
        onChange={(e) => {
          // Copied before the reset below: the FileList is live and would be empty afterwards.
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length > 0) void upload(files)
        }}
      />

      {mainImage !== null ? (
        <ImageMenu
          label="Hauptbild"
          onRemove={() => onChange({ mainImage: null })}
          onRemovedFocus={focusUpload}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-lg phone:aspect-video"
        >
          <RecipeImage image={mainImage} alt="" className="size-full object-cover" fallbackClassName="size-full" />
          <span className="absolute top-2 left-2 rounded-sm bg-black/55 px-1.5 py-0.5 text-xs font-semibold text-white">
            Hauptbild
          </span>
        </ImageMenu>
      ) : (
        <Label
          htmlFor="image-upload"
          className={cn(
            TILE,
            'grid aspect-[4/3] w-full place-content-center justify-items-center gap-1.5 rounded-lg font-normal',
            images.length > 0 && 'phone:aspect-video',
          )}
        >
          <ImageIcon className="size-6" />
          <span>Fotos hinzufügen</span>
          <span className="text-xs">Das erste wird Hauptbild</span>
        </Label>
      )}

      {/* Always mounted, so screen readers announce the upload when it starts. */}
      <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground empty:hidden">
        {uploading && (
          <>
            <Spinner className="mt-1.5 size-3.5" />
            <span className="mt-1.5">Lädt hoch …</span>
          </>
        )}
      </span>

      {hasImages && (
        <>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5 phone:grid-cols-5">
            {images.map((image, i) => (
              <ImageMenu
                key={image.id}
                label={`Bild ${i + 1}`}
                onMakeMain={() =>
                  onChange({
                    mainImage: image,
                    images: [...images.filter((im) => im.id !== image.id), ...(mainImage === null ? [] : [mainImage])],
                  })
                }
                onRemove={() => onChange({ images: images.filter((im) => im.id !== image.id) })}
                onRemovedFocus={focusUpload}
                className="aspect-square overflow-hidden rounded-md"
              >
                <RecipeImage image={image} alt="" className="size-full object-cover" fallbackClassName="size-full" />
              </ImageMenu>
            ))}
            {mainImage !== null && (
              <Label
                htmlFor="image-upload"
                aria-label="Weitere Fotos hinzufügen"
                className={cn(TILE, 'grid aspect-square place-items-center rounded-md')}
              >
                <Plus className="size-4" />
              </Label>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Bild antippen: als Hauptbild setzen oder entfernen.</p>
        </>
      )}
    </div>
  )
}

// The image itself is the trigger (mockup: "Bild antippen"); the menu holds what the old per-image buttons did.
function ImageMenu({
  label,
  onMakeMain,
  onRemove,
  onRemovedFocus,
  className,
  children,
}: {
  label: string
  onMakeMain?: () => void
  onRemove: () => void
  onRemovedFocus: (e: Event) => void
  className: string
  children: ReactNode
}) {
  const removed = useRef(false)
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <TriggerButton variant="bare" aria-label={label} className={cn('block cursor-pointer', className)}>
          {children}
        </TriggerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={(e) => {
          if (removed.current) onRemovedFocus(e)
          removed.current = false
        }}
      >
        {onMakeMain && (
          <DropdownMenuItem className="gap-2" onSelect={onMakeMain}>
            <Star className="size-4" />
            Als Hauptbild
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          className="gap-2"
          onSelect={() => {
            removed.current = true
            onRemove()
          }}
        >
          <Trash2 className="size-4" />
          Entfernen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
