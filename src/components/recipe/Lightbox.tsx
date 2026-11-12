import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, cn } from '@postxl/ui-components'
import { imageName } from '../../api/assets'
import { RecipeImage } from './RecipeImage'
import type { ImageRef } from '../../api/protocol'
import { FOCUS_RING } from '../focusRing'
import { TriggerButton } from '../TriggerButton'

// Fullscreen image viewer. The overlay closes on click / Escape; clicks on the
// image, caption, controls and thumbnail strip don't bubble up to it.
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: ImageRef[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const n = images.length
  const go = useCallback((delta: number) => onIndexChange((index + delta + n) % n), [index, n, onIndexChange])
  const stripRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Which side of the image fills the box. Sizing the <img> element to the
  // *visible* image (not the whole box) means it has no transparent margin, so a
  // click next to the image hits the backdrop and closes.
  const [fit, setFit] = useState<'w' | 'h'>('h')
  const computeFit = () => {
    const img = imgRef.current
    if (!img || !img.naturalWidth) return
    const imageAspect = img.naturalWidth / img.naturalHeight
    const boxAspect = (window.innerWidth / window.innerHeight) * (50 / 64) // box is 50vw × 64vh
    setFit(imageAspect >= boxAspect ? 'w' : 'h')
  }
  useEffect(() => {
    if (imgRef.current?.complete) computeFit()
  }, [index])
  useEffect(() => {
    window.addEventListener('resize', computeFit)
    return () => window.removeEventListener('resize', computeFit)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  // While open: hide the page scrollbar (padding-compensated, no jump) and
  // swallow manual scroll. Programmatic scrolling (caller's auto-scroll) is fine.
  useEffect(() => {
    const html = document.documentElement
    const scrollbarW = window.innerWidth - html.clientWidth
    const prevPad = html.style.paddingRight
    html.style.setProperty('scrollbar-width', 'none')
    if (scrollbarW > 0) html.style.paddingRight = `${scrollbarW}px`
    const swallow = (e: Event) => e.preventDefault()
    const swallowKeys = (e: KeyboardEvent) => {
      // Space on a focused button inside the lightbox activates it (no scroll); cancelling its keydown would
      // swallow the click. Buttons on the page behind stay blocked (focus isn't moved into the dialog).
      const t = e.target
      if (e.key === ' ' && t instanceof Element && t.closest('button') && dialogRef.current?.contains(t)) return
      if ([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault()
    }
    window.addEventListener('wheel', swallow, { passive: false })
    window.addEventListener('touchmove', swallow, { passive: false })
    window.addEventListener('keydown', swallowKeys)
    return () => {
      html.style.removeProperty('scrollbar-width')
      html.style.paddingRight = prevPad
      window.removeEventListener('wheel', swallow)
      window.removeEventListener('touchmove', swallow)
      window.removeEventListener('keydown', swallowKeys)
    }
  }, [])

  // Keep the active thumbnail in the front third of the strip; clamp at the ends
  // (no looping).
  useEffect(() => {
    const strip = stripRef.current
    const tile = strip?.children[index] as HTMLElement | undefined
    if (!strip || !tile) return
    const target = tile.offsetLeft - strip.clientWidth / 3
    strip.scrollTo({ left: Math.max(0, Math.min(target, strip.scrollWidth - strip.clientWidth)), behavior: 'smooth' })
  }, [index])

  const image = images[index]
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  const ctrl = cn(
    'flex h-14 w-14 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white/60',
    FOCUS_RING,
  )
  // Upscale small images too: force the limiting side to the box max, the other
  // follows the aspect ratio (so the element == the visible image, no letterbox).
  const imgFit = fit === 'w' ? 'w-[50vw] h-auto' : 'h-[64vh] w-auto'

  return createPortal(
    // cursor-zoom-out: clicking the backdrop shrinks the image again.
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex cursor-zoom-out flex-col items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Schließen"
        onClick={(e) => {
          stop(e)
          onClose()
        }}
        className={`absolute right-5 top-5 ${ctrl}`}
      >
        <X className="size-7" />
      </Button>

      {/* Fixed-height image area (always 50vh) so the caption + strip below it
          stay put regardless of the image's aspect ratio. */}
      <div className="relative flex h-[64vh] w-full items-center justify-center">
        {n > 1 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Vorheriges Bild"
            onClick={(e) => {
              stop(e)
              go(-1)
            }}
            className={`absolute left-[18vw] top-1/2 -translate-y-1/2 ${ctrl}`}
          >
            <ChevronLeft className="size-8" />
          </Button>
        )}
        <RecipeImage
          ref={imgRef}
          image={image}
          alt={imageName(image)}
          onLoad={computeFit}
          onClick={stop}
          className={`${imgFit} max-h-[64vh] max-w-[50vw] cursor-default rounded-lg object-contain`}
          fallbackClassName="h-[64vh] w-[50vw] cursor-default rounded-lg"
        />
        {n > 1 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Nächstes Bild"
            onClick={(e) => {
              stop(e)
              go(1)
            }}
            className={`absolute right-[18vw] top-1/2 -translate-y-1/2 ${ctrl}`}
          >
            <ChevronRight className="size-8" />
          </Button>
        )}
      </div>

      <p onClick={stop} className="mt-10 cursor-default text-center text-xl text-white">
        {imageName(image)}
        {n > 1 && (
          <span className="ml-6 text-lg text-white/60">
            {index + 1} / {n}
          </span>
        )}
      </p>

      {n > 1 && (
        <div
          ref={stripRef}
          onClick={stop}
          className="mt-12 flex max-w-[60vw] cursor-default gap-2 overflow-x-auto p-1.5 [scrollbar-width:none]"
        >
          {images.map((thumb, i) => (
            <TriggerButton
              key={thumb.id}
              variant="bare"
              onClick={() => onIndexChange(i)}
              aria-label={imageName(thumb)}
              aria-current={i === index || undefined}
              // The offset gap tells keyboard focus apart from the active marker (ring-2 vs. 3 px alone is 1 px);
              // the strip's p-1.5 leaves room for ring + offset inside its overflow clip.
              className={cn(
                'group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                i === index && 'ring-2 ring-white focus-visible:ring-white',
              )}
            >
              <RecipeImage
                image={thumb}
                alt=""
                className="h-full w-full object-cover"
                fallbackClassName="h-full w-full"
              />
              {/* dim overlay (not the image's opacity); lifts on hover / when active */}
              {i !== index && (
                <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-transparent" />
              )}
            </TriggerButton>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
