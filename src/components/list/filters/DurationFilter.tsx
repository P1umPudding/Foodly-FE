import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react'
import { Button, NumberInput, Slider, cn } from '@postxl/ui-components'
import type { ListState } from '../../../list/state'
import { FilterHint } from './FilterCheckRow'

// Upper bound for the work-time slider and field (minutes). The knob's far-right position means "no limit"
// (`null`); only the field (or the URL) can still set a real 180 — same knob position, the field shows the
// difference.
const DURATION_MAX = 180
const NO_LIMIT = 'Keine Grenze'
const DURATION_PRESETS = [15, 30, 60] as const
// Arrow keys on the knob commit per key in Radix; bursts are bundled so a run of key presses is one search.
const KEY_COMMIT_MS = 400

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
  const shown = draft ? draft.v : value

  // Deferred commits (timer, blur) run outside render, so they read the latest props through refs. valueRef is
  // also moved ahead by commit(), so an edit right after a commit, before the re-render, starts from the
  // committed value. (With react-router's v7_startTransition the re-render could lag further; not enabled.)
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
  // The field commits on blur, except into the knob: typing, then dragging is one edit. Presets keep focus in the
  // field on press (preventDefault) — some browsers (Safari) never focus a clicked button, so the blur would
  // otherwise commit the half-finished value right before the click commits its own.
  const onFieldBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (!(e.relatedTarget instanceof Node && sliderBoxRef.current?.contains(e.relatedTarget))) flush()
  }
  // Only while the field has focus.
  const keepFocus = (e: MouseEvent) => {
    if (document.activeElement === fieldRef.current) e.preventDefault()
  }
  // Typing or a drag supersedes pending arrow keys, or the timer would commit a half-finished value. Leaving the
  // knob already flushes them, so for typing this is a guard. (Not in edit(): for keys Radix calls onValueChange
  // right after onValueCommit has started the timer.)
  const cancelKeyCommit = () => clearTimeout(keyTimer.current)
  // A drag Radix sees as unchanged (a real 180 dragged to "no limit") fires no commit. This runs after Radix's own
  // pointer-up, so after a normal commit there is nothing left to flush.
  const onSliderPointerUp = () => {
    pointerRef.current = false
    flush()
  }

  return (
    <div className="flex flex-col px-1.5 pt-1.5">
      <div className="flex items-center gap-3">
        {/* px gives the knob's hover ring room — a scrolling parent also clips horizontally, which would
            otherwise cut the ring at the ends. Needs ≥ half-thumb (8px) + ring (4px).
            Blur and pointer-up sit here because the thumb's own props aren't reachable through postxl. */}
        <div
          ref={sliderBoxRef}
          className="min-w-0 flex-1 px-4"
          onBlur={flush}
          onPointerUp={onSliderPointerUp}
          onPointerCancel={onSliderPointerUp}
        >
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
            onPointerDown={() => {
              pointerRef.current = true
              cancelKeyCommit()
            }}
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
            className="w-full [&_[data-slot=slider-thumb]]:border-muted-foreground [&_[data-slot=slider-thumb]]:ring-muted-foreground/40 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-divider"
          />
        </div>
        <NumberInput
          ref={fieldRef}
          aria-label="Maximale Arbeitszeit in Minuten"
          value={shown ?? undefined}
          // Unclamped while typing (typing 200 on the way to 20 is fine); clamped on commit.
          onChange={(v) => {
            cancelKeyCommit()
            edit(v === undefined ? null : v)
          }}
          onBlur={onFieldBlur}
          onEnter={flush}
          min={0}
          max={DURATION_MAX}
          showSpinButtons={false}
          // "≤ – min" without a limit (mockup); the slider's value text still says "Keine Grenze".
          placeholder="–"
          prefix="≤"
          suffix="min"
          // suffix is the wrapper's last child span → shrink just "min"
          wrapperClassName="min-h-8 phone:min-h-10 w-28 shrink-0 [&>span:last-child]:text-xs [&>span:first-child]:text-base"
          // dark:bg-transparent so the input area matches the wrapper (the lib leaves dark:bg-input/30 on the
          // input, which otherwise differs from prefix/suffix).
          className="bg-transparent text-right dark:bg-transparent"
        />
      </div>
      {/* Selection is JS-driven so typing 60 lights „60 min“; pressing the lit one again clears the limit. */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {DURATION_PRESETS.map((m) => (
          <Button
            key={m}
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={keepFocus}
            aria-pressed={shown === m}
            aria-label={`≤ ${m} Minuten`}
            onClick={() => commit(shown === m ? null : m)}
            // bg-sidebar-accent: the mockup's --active (pressed) fill, a step darker than the hover fill.
            className={cn(
              'phone:h-10',
              shown === m &&
                'bg-sidebar-accent hover:bg-sidebar-accent dark:bg-sidebar-accent dark:hover:bg-sidebar-accent',
            )}
          >
            {m} min
          </Button>
        ))}
      </div>
      <FilterHint>Zählt die Arbeitszeit. Rezepte ohne Angabe fallen raus.</FilterHint>
    </div>
  )
}
