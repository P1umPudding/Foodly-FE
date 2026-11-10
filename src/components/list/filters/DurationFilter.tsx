import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, NumberInput, Slider, ToggleGroup } from '@postxl/ui-components'
import { X } from 'lucide-react'
import type { ListState } from '../../../list/state'
import { FocusToggleGroupItem } from '../FocusToggleGroupItem'

// Upper bound for the work-time slider and field (minutes). The knob's far-right position means "no limit"
// (`null`); only the field (or the URL) can still set a real 180 — same knob position, the field shows the
// difference.
const DURATION_MAX = 180
const NO_LIMIT = 'Keine Grenze'
const DURATION_PRESETS = [15, 30, 60] as const
// Arrow keys on the knob commit per key in Radix; bursts are bundled so a run of key presses is one search.
const KEY_COMMIT_MS = 400

// Neutral "selected" emphasis — selection reads via fill + ring + weight, not a brand hue (colour stays
// reserved for category/access meaning). Inset only at rest: a focused toggle draws its 3-px focus ring
// outside, like the unselected ones (#95).
const SELECTED_CHIP =
  'bg-foreground/15 font-medium text-foreground ring-1 not-focus-visible:ring-inset ring-foreground/30'

function clamp(v: number): number {
  return Math.min(DURATION_MAX, Math.max(0, v))
}

const toLimit = (v: number): number | null => (v === DURATION_MAX ? null : v)

// An uncommitted edit, tied to the value it started from: once the value changes from outside (Back/Forward,
// clear-all, a chip's ✕) the edit no longer applies.
type Draft = { base: number | null; v: number | null }

// One value, three ways to set it (slider, field, presets). The controls follow a drag or typing at once, but
// the list (URL, history entry, search) only gets the end value — on release, blur/Enter or after a pause in
// arrow keys (#130).
export function DurationFilter({ value, set }: { value: number | null; set: (patch: Partial<ListState>) => void }) {
  const fieldRef = useRef<HTMLInputElement>(null)
  const sliderBoxRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  if (draft && draft.base !== value) setDraft(null)
  const shown = draft && draft.base === value ? draft.v : value

  // Deferred commits (timer, blur) run outside render, so they read the latest props through refs. valueRef is
  // also moved ahead by commit(): an edit in the same event (field blur → knob grab) must start from the
  // committed value, not the not-yet-rendered old one.
  const valueRef = useRef(value)
  const setRef = useRef(set)
  const pendingRef = useRef<Draft | null>(null)
  const keyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pointerRef = useRef(false)
  const mountedRef = useRef(false)
  useLayoutEffect(() => {
    valueRef.current = value
    setRef.current = set
    // Forget an edit overtaken from outside for good, or Back-then-Forward would bring it back.
    if (pendingRef.current && pendingRef.current.base !== value) pendingRef.current = null
  }, [value, set])
  // No commit on unmount: set() navigates relative to the route at hand, which after a browser Back is already
  // gone — it would push the list on top again. An unfinished edit is dropped instead.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(keyTimer.current)
    }
  }, [])

  const commit = (v: number | null) => {
    clearTimeout(keyTimer.current)
    pendingRef.current = null
    setDraft(null)
    if (v === valueRef.current) return
    valueRef.current = v
    setRef.current({ durationMax: v })
  }
  const edit = (v: number | null) => {
    const next = { base: valueRef.current, v }
    pendingRef.current = next
    setDraft(next)
  }
  const flush = () => {
    const pending = pendingRef.current
    if (!pending) return
    if (!mountedRef.current || pending.base !== valueRef.current) {
      pendingRef.current = null
      return
    }
    commit(pending.v === null ? null : clamp(pending.v))
  }

  // The postxl Slider neither exposes its (single) thumb nor forwards aria props to it, so the value text is
  // set on the DOM node directly — before paint, so valuenow and valuetext never disagree for a frame. Radix
  // never manages aria-valuetext, so re-renders keep it.
  useLayoutEffect(() => {
    const thumb = sliderBoxRef.current?.querySelector('[role=slider]')
    if (shown === null) thumb?.setAttribute('aria-valuetext', NO_LIMIT)
    else thumb?.removeAttribute('aria-valuetext')
  }, [shown])
  const presetActive = (DURATION_PRESETS as readonly number[]).includes(shown ?? -1)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* px gives the knob's hover ring room — a scrolling parent also clips horizontally, which would
            otherwise cut the ring at the ends. Needs ≥ half-thumb (8px) + ring (4px). */}
        {/* onBlur here: the thumb's own props aren't reachable through postxl. */}
        <div ref={sliderBoxRef} className="min-w-0 flex-1 px-4" onBlur={flush}>
          <Slider
            aria-label="Maximale Arbeitszeit"
            // Neutral (not the brand purple): the built-in gray variant for the range, knob border + hover
            // ring recoloured through the data-slot hooks the component exposes.
            sliderVariant="gray"
            min={0}
            max={DURATION_MAX}
            step={5}
            value={[clamp(shown ?? DURATION_MAX)]}
            onValueChange={([v]) => edit(toLimit(v))}
            // Radix commits on pointer-up (only if the value changed) and on every key; keydown runs before
            // Radix's handler, so a click without a change can't leave the pointer flag set for the next key.
            onPointerDown={() => (pointerRef.current = true)}
            onKeyDown={() => (pointerRef.current = false)}
            onValueCommit={([v]) => {
              if (pointerRef.current) {
                pointerRef.current = false
                commit(toLimit(v))
                return
              }
              // For keys Radix calls this before onValueChange, so record the value here rather than read the draft.
              edit(toLimit(v))
              clearTimeout(keyTimer.current)
              keyTimer.current = setTimeout(flush, KEY_COMMIT_MS)
            }}
            className="w-full [&_[data-slot=slider-thumb]]:border-muted-foreground [&_[data-slot=slider-thumb]]:ring-muted-foreground/40"
          />
        </div>
        <NumberInput
          ref={fieldRef}
          aria-label="Maximale Arbeitszeit in Minuten"
          value={shown ?? undefined}
          // Unclamped while typing (typing 200 on the way to 20 is fine); clamped on commit.
          onChange={(v) => edit(v === undefined ? null : v)}
          onBlur={flush}
          onEnter={flush}
          min={0}
          max={DURATION_MAX}
          showSpinButtons={false}
          placeholder={NO_LIMIT}
          // Without a limit the field reads just "Keine Grenze", not "≤ Keine Grenze min".
          prefix={shown === null ? undefined : '≤'}
          suffix={shown === null ? undefined : 'min'}
          // suffix is the wrapper's last child span → shrink just "min"
          wrapperClassName="min-h-8 phone:min-h-10 w-28 shrink-0 [&>span:last-child]:text-xs [&>span:first-child]:text-base"
          // dark:bg-transparent so the input area matches the wrapper (the lib leaves dark:bg-input/30 on the
          // input, which otherwise differs from prefix/suffix). text-xs placeholder: "Keine Grenze" at the input's
          // 14/16 px barely fits w-28.
          className="bg-transparent text-right placeholder:text-xs dark:bg-transparent"
        />
      </div>
      {/* Selection is JS-driven so typing 60 lights ≤ 60. */}
      <ToggleGroup
        type="single"
        className="w-full"
        value={presetActive ? String(shown) : ''}
        onValueChange={(v) => commit(v === '' ? null : Number(v))}
      >
        {DURATION_PRESETS.map((m) => (
          <FocusToggleGroupItem
            key={m}
            value={String(m)}
            aria-label={`≤ ${m} Minuten`}
            className={`h-7 flex-1 px-1.5 text-xs phone:h-10 ${shown === m ? SELECTED_CHIP : ''}`}
          >
            ≤ {m} Min
          </FocusToggleGroupItem>
        ))}
      </ToggleGroup>
      {/* A same-height placeholder while there is no limit, so the filter doesn't jump when it appears. */}
      {shown === null ? (
        <span aria-hidden className="h-7 phone:h-10" />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          // The button disappears with the limit; hand focus to the field so keyboard users aren't dropped on <body>.
          // Keyboard activation only (detail 0): on a tap, focusing the field would pop up the phone keyboard.
          onClick={(e) => {
            commit(null)
            if (e.detail === 0) fieldRef.current?.focus()
          }}
          className="h-7 gap-1 self-end px-2 text-muted-foreground hover:text-foreground phone:h-10"
        >
          <X className="h-3.5 w-3.5" />
          Zurücksetzen
        </Button>
      )}
    </div>
  )
}
