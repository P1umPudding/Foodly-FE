import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { cn } from '@postxl/ui-components'

// iOS-style wheel/drum picker — the one deliberate hand-rolled control (no postxl
// component for it). Three looping columns (Std:Min:Sek). Values wrap infinitely,
// and one wheel notch / key press / drag-step advances exactly one number; the
// centre value is the selected one. You can also click a column and type digits
// (it auto-advances to the next column once a field is full). Top/bottom fades
// let numbers appear and vanish "out of nothing".

export type Duration = { h: number; m: number; s: number }

const ITEM_H = 40 // px per row; the Tailwind h-/translate values below track this
const VISIBLE = 3 // odd, so one row sits dead-centre (one context row above/below)
const HALF = (VISIBLE - 1) / 2
const WHEEL_COOLDOWN_MS = 60 // one step per notch; caps trackpad inertia
const TYPE_RESET_MS = 1500 // forget a half-typed value after a pause

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function WheelColumn({
  label,
  range,
  value,
  onChange,
  columnRef,
  onComplete,
}: {
  label: string
  range: number
  value: number
  onChange: (v: number) => void
  columnRef: RefObject<HTMLDivElement>
  onComplete?: () => void
}) {
  const reelRef = useRef<HTMLDivElement>(null)
  const max = range - 1

  // A one-row slide that reads as a rotation: jump the reel by one row, then
  // ease it back to rest while the freshly-centred values are already in place.
  const slide = (dir: number) => {
    const reel = reelRef.current
    if (!reel || prefersReducedMotion()) return
    reel.style.transition = 'none'
    reel.style.transform = `translateY(${dir * ITEM_H}px)`
    requestAnimationFrame(() => {
      reel.style.transition = 'transform 140ms ease-out'
      reel.style.transform = 'translateY(0)'
    })
  }

  const step = (dir: number) => {
    if (dir === 0) return
    slide(dir > 0 ? 1 : -1)
    onChange(mod(value + dir, range))
  }
  // Latest step in a ref so the once-attached native listeners never go stale.
  const stepRef = useRef(step)
  stepRef.current = step

  // Direct digit entry: "1" then "2" → 12, then jump to the next column. A digit
  // that can't be a tens place (e.g. 6 in a 0–59 field) completes immediately.
  const buffer = useRef('')
  const bufferTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const resetBuffer = () => {
    buffer.current = ''
    clearTimeout(bufferTimer.current)
  }
  const typeDigit = (key: string) => {
    const d = Number(key)
    clearTimeout(bufferTimer.current)
    if (buffer.current === '') {
      onChange(Math.min(d, max))
      if (d * 10 > max) {
        resetBuffer()
        onComplete?.()
      } else {
        buffer.current = key
        bufferTimer.current = setTimeout(() => {
          buffer.current = ''
        }, TYPE_RESET_MS)
      }
    } else {
      onChange(Math.min(Number(buffer.current) * 10 + d, max))
      resetBuffer()
      onComplete?.()
    }
  }

  // Wheel + touch must be non-passive native listeners: we preventDefault the
  // page scroll and advance by exactly one value per notch / per row dragged.
  useEffect(() => {
    const el = columnRef.current
    if (!el) return

    let lock = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (Math.abs(e.deltaY) < 1) return
      if (e.timeStamp - lock < WHEEL_COOLDOWN_MS) return
      lock = e.timeStamp
      stepRef.current(e.deltaY > 0 ? 1 : -1)
    }

    let startY: number | null = null
    let accum = 0
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      accum = 0
    }
    const onTouchMove = (e: TouchEvent) => {
      if (startY === null) return
      e.preventDefault()
      const y = e.touches[0].clientY
      accum += startY - y // dragging up advances to higher numbers
      startY = y
      while (Math.abs(accum) >= ITEM_H) {
        const dir = accum > 0 ? 1 : -1
        stepRef.current(dir)
        accum -= dir * ITEM_H
      }
    }
    const onTouchEnd = () => {
      startY = null
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [columnRef])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      step(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      step(1)
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      typeDigit(e.key)
    }
  }

  return (
    <div
      ref={columnRef}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={resetBuffer}
      // `focus` (not focus-visible) + inset ring: the active column is clearly
      // highlighted even when entered by click, and the inset ring isn't clipped
      // by overflow-hidden the way an outer ring is.
      className="relative h-[120px] w-14 touch-none overflow-hidden rounded-md bg-transparent outline-none select-none focus:bg-muted/40 focus:ring-2 focus:ring-inset focus:ring-primary"
    >
      <div ref={reelRef} className="will-change-transform">
        {Array.from({ length: VISIBLE }, (_, i) => {
          const offset = i - HALF
          const n = mod(value + offset, range)
          const selected = offset === 0
          return (
            <div
              key={offset}
              role="option"
              aria-selected={selected}
              // Click focuses the column to type into; it does not yank the value
              // to the clicked row (that made click-to-edit feel unpredictable).
              // Scroll / arrows / typing change the value.
              onClick={() => columnRef.current?.focus()}
              className={cn(
                'flex h-[40px] cursor-pointer items-center justify-center text-lg tabular-nums',
                selected ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {String(n).padStart(2, '0')}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DurationPicker({ value, onChange }: { value: Duration; onChange: (v: Duration) => void }) {
  const hRef = useRef<HTMLDivElement>(null)
  const mRef = useRef<HTMLDivElement>(null)
  const sRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative flex items-center justify-center gap-1 select-none">
      {/* Resting centre frame marking the selected row. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[40px] -translate-y-1/2 rounded-md border-y border-border bg-muted/40" />

      <WheelColumn
        label="Stunden"
        range={24}
        value={value.h}
        columnRef={hRef}
        onChange={(h) => onChange({ ...value, h })}
        onComplete={() => mRef.current?.focus()}
      />
      <span className="text-muted-foreground">:</span>
      <WheelColumn
        label="Minuten"
        range={60}
        value={value.m}
        columnRef={mRef}
        onChange={(m) => onChange({ ...value, m })}
        onComplete={() => sRef.current?.focus()}
      />
      <span className="text-muted-foreground">:</span>
      <WheelColumn
        label="Sekunden"
        range={60}
        value={value.s}
        columnRef={sRef}
        onChange={(s) => onChange({ ...value, s })}
      />

      {/* Numbers fade into the panel background at the top and bottom edges (one
          row tall, so the centre value stays fully solid). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40px] bg-gradient-to-b from-background from-20% to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40px] bg-gradient-to-t from-background from-20% to-transparent" />
    </div>
  )
}
