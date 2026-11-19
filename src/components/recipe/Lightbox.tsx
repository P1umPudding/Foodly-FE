import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, cn } from '@postxl/ui-components'
import { imageName } from '../../api/assets'
import { RecipeImage } from './RecipeImage'
import type { ImageRef } from '../../api/protocol'
import { FOCUS_RING } from '../focusRing'
import { TriggerButton } from '../TriggerButton'

// Fullscreen image viewer (mockup `lb=<n>`). A click on the empty stage or the top bar closes it; clicks on
// the image, counter, controls and thumbnail strip don't bubble up. Phone: no arrow buttons, swipe instead.
// The background is a fixed near-black in both themes, as in the mockup.

const SWIPE_MIN_PX = 50

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
  const dialogRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null)
  const swiped = useRef(false)

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
    // The thumbnail strip stays finger-scrollable: on the phone it is the only direct way to pick an image.
    // Its touch-pan-x + overscroll-contain keep that drag from reaching the page behind.
    // Only one finger: a pinch that starts on the strip must still not zoom the page.
    const swallowTouch = (e: TouchEvent) => {
      if (e.touches.length === 1 && e.target instanceof Node && stripRef.current?.contains(e.target)) return
      e.preventDefault()
    }
    const swallowKeys = (e: KeyboardEvent) => {
      // Space on a focused button inside the lightbox activates it (no scroll); cancelling its keydown would
      // swallow the click. Buttons on the page behind stay blocked (focus isn't moved into the dialog).
      const t = e.target
      if (e.key === ' ' && t instanceof Element && t.closest('button') && dialogRef.current?.contains(t)) return
      if ([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault()
    }
    window.addEventListener('wheel', swallow, { passive: false })
    window.addEventListener('touchmove', swallowTouch, { passive: false })
    window.addEventListener('keydown', swallowKeys)
    return () => {
      html.style.removeProperty('scrollbar-width')
      html.style.paddingRight = prevPad
      window.removeEventListener('wheel', swallow)
      window.removeEventListener('touchmove', swallowTouch)
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

  // Swipe: touch and pen only, so a mouse click on the stage still closes. Reset on every pointerdown, since
  // browsers usually send no click after a swipe and a stale flag would swallow the next tap.
  const onPointerDown = (e: React.PointerEvent) => {
    swiped.current = false
    if (e.pointerType === 'mouse' || n < 2) return
    // A second finger turns the gesture into a pinch: never a swipe.
    if (!e.isPrimary) {
      swipeStart.current = null
      return
    }
    swipeStart.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current
    if (!start || start.id !== e.pointerId) return
    swipeStart.current = null
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return
    swiped.current = true
    go(dx < 0 ? 1 : -1)
  }
  const onPointerCancel = () => {
    swipeStart.current = null
  }
  // A click that ends a swipe (e.g. on an arrow or the empty stage) must neither step again nor close.
  // Keyboard clicks (detail 0) never end a swipe, so a stale flag can't swallow Enter on an arrow.
  const onClickCapture = (e: React.MouseEvent) => {
    if (!swiped.current || e.detail === 0) return
    swiped.current = false
    e.stopPropagation()
  }

  const image = images[index]
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  // postxl's ghost variant brings its own dark:hover background, which would win over a plain hover: class.
  const ctrl = cn(
    'size-10 rounded-md bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white/60 dark:hover:bg-white/20 dark:hover:text-white',
    FOCUS_RING,
  )

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Fotos"
      onClick={onClose}
      // The backdrop fills the whole screen, the controls stay clear of notch and home indicator (viewport-fit=cover).
      className="fixed inset-0 z-[100] flex cursor-zoom-out flex-col bg-[oklch(0.12_0_0)] pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-white"
    >
      <div className="flex h-14 shrink-0 items-center justify-between pl-5 pr-3">
        <span onClick={stop} aria-live="polite" className="cursor-default text-sm tabular-nums text-white/75">
          {`${index + 1} / ${n}`}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Schließen"
          onClick={(e) => {
            stop(e)
            onClose()
          }}
          className={ctrl}
        >
          <X className="size-5" />
        </Button>
      </div>

      {/* touch-none: without it the browser takes over a horizontal drag and cancels the swipe
          (pointercancel). Pinch-zoom was already off through the window touchmove lock.
          The strip only lets single-finger drags through, and only horizontally (touch-pan-x). */}
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
        className="relative grid min-h-0 flex-1 touch-none place-items-center px-[72px] phone:px-0"
      >
        {n > 1 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Vorheriges Bild"
            onClick={(e) => {
              stop(e)
              go(-1)
            }}
            className={cn('absolute left-4 top-1/2 -translate-y-1/2 phone:hidden', ctrl)}
          >
            <ChevronLeft className="size-5" />
          </Button>
        )}
        {/* Max sizes only (as in the mockup): the <img> box stays the visible image, so a click beside it
            reaches the stage and closes. 140 px = top bar 56 + thumbnail strip 84, plus the safe-area insets the backdrop pads. */}
        <RecipeImage
          image={image}
          alt={imageName(image)}
          onClick={stop}
          className="max-h-[calc(100dvh-140px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-full cursor-default rounded-md object-contain phone:rounded-none"
          fallbackClassName="h-[calc(100dvh-140px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-4xl cursor-default rounded-md bg-white/10 text-white/40 phone:max-w-none phone:rounded-none"
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
            className={cn('absolute right-4 top-1/2 -translate-y-1/2 phone:hidden', ctrl)}
          >
            <ChevronRight className="size-5" />
          </Button>
        )}
      </div>

      {n > 1 && (
        // Auto margins centre the tiles but collapse when they overflow, unlike justify-center, which would
        // cut off the first tiles.
        <div
          ref={stripRef}
          onClick={stop}
          className="relative flex shrink-0 cursor-default touch-pan-x gap-1.5 overflow-x-auto overscroll-contain p-3.5 [scrollbar-width:none] [&>:first-child]:ms-auto [&>:last-child]:me-auto"
        >
          {images.map((thumb, i) => (
            <TriggerButton
              key={thumb.id}
              variant="bare"
              onClick={() => onIndexChange(i)}
              aria-label={imageName(thumb)}
              aria-current={i === index || undefined}
              // Selection is the white border, focus the ring with an offset gap. Focus lifts the dimming,
              // or the ring would drop below 3:1 at 55 % opacity.
              className={cn(
                'size-14 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 border-transparent transition-opacity phone:size-11',
                'focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.12_0_0)]',
                i === index ? 'border-white' : 'opacity-55 hover:opacity-100 focus-visible:opacity-100',
              )}
            >
              <RecipeImage
                image={thumb}
                alt=""
                className="h-full w-full object-cover"
                fallbackClassName="h-full w-full bg-white/10 text-white/40"
              />
            </TriggerButton>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
