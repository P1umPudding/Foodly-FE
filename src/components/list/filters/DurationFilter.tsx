import { useLayoutEffect, useRef } from 'react'
import { Button, NumberInput, Slider, ToggleGroup } from '@postxl/ui-components'
import { X } from 'lucide-react'
import type { ListState } from '../../../list/state'
import { FocusToggleGroupItem } from '../FocusToggleGroupItem'

// Upper bound for the work-time slider and field (minutes). The knob's far-right position means "no limit"
// (`null`); only the field (or the URL) can still set a real 180 — same knob position, the field shows the difference.
const DURATION_MAX = 180
const NO_LIMIT = 'Keine Grenze'
const DURATION_PRESETS = [15, 30, 60] as const

// Neutral "selected" emphasis — selection reads via fill + ring + weight, not a brand hue (colour stays
// reserved for category/access meaning). Inset only at rest: a focused toggle draws its 3-px focus ring
// outside, like the unselected ones (#95).
const SELECTED_CHIP =
  'bg-foreground/15 font-medium text-foreground ring-1 not-focus-visible:ring-inset ring-foreground/30'

function clamp(v: number): number {
  return Math.min(DURATION_MAX, Math.max(0, v))
}

// One value, three ways to set it (slider, field, presets); all follow each other immediately.
export function DurationFilter({ value, set }: { value: number | null; set: (patch: Partial<ListState>) => void }) {
  const onChange = (durationMax: number | null) => set({ durationMax })
  const fieldRef = useRef<HTMLInputElement>(null)
  const sliderBoxRef = useRef<HTMLDivElement>(null)
  // The postxl Slider neither exposes its (single) thumb nor forwards aria props to it, so the value text is
  // set on the DOM node directly — before paint, so valuenow and valuetext never disagree for a frame. Radix
  // never manages aria-valuetext, so re-renders keep it.
  useLayoutEffect(() => {
    const thumb = sliderBoxRef.current?.querySelector('[role=slider]')
    if (value === null) thumb?.setAttribute('aria-valuetext', NO_LIMIT)
    else thumb?.removeAttribute('aria-valuetext')
  }, [value])
  const presetActive = (DURATION_PRESETS as readonly number[]).includes(value ?? -1)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* px gives the knob's hover ring room — a scrolling parent also clips horizontally, which would
            otherwise cut the ring at the ends. Needs ≥ half-thumb (8px) + ring (4px). */}
        <div ref={sliderBoxRef} className="min-w-0 flex-1 px-4">
          <Slider
            aria-label="Maximale Arbeitszeit"
            // Neutral (not the brand purple): the built-in gray variant for the range, knob border + hover
            // ring recoloured through the data-slot hooks the component exposes.
            sliderVariant="gray"
            min={0}
            max={DURATION_MAX}
            step={5}
            value={[value ?? DURATION_MAX]}
            onValueChange={([v]) => onChange(v === DURATION_MAX ? null : v)}
            className="w-full [&_[data-slot=slider-thumb]]:border-muted-foreground [&_[data-slot=slider-thumb]]:ring-muted-foreground/40"
          />
        </div>
        <NumberInput
          ref={fieldRef}
          aria-label="Maximale Arbeitszeit in Minuten"
          value={value ?? undefined}
          onChange={(v) => onChange(v === undefined ? null : clamp(v))}
          min={0}
          max={DURATION_MAX}
          showSpinButtons={false}
          placeholder={NO_LIMIT}
          // Without a limit the field reads just "Keine Grenze", not "≤ Keine Grenze min".
          prefix={value === null ? undefined : '≤'}
          suffix={value === null ? undefined : 'min'}
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
        value={presetActive ? String(value) : ''}
        onValueChange={(v) => onChange(v === '' ? null : Number(v))}
      >
        {DURATION_PRESETS.map((m) => (
          <FocusToggleGroupItem
            key={m}
            value={String(m)}
            aria-label={`≤ ${m} Minuten`}
            className={`h-7 flex-1 px-1.5 text-xs phone:h-10 ${value === m ? SELECTED_CHIP : ''}`}
          >
            ≤ {m} Min
          </FocusToggleGroupItem>
        ))}
      </ToggleGroup>
      {/* A same-height placeholder while there is no limit, so the filter doesn't jump when it appears. */}
      {value === null ? (
        <span aria-hidden className="h-7 phone:h-10" />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          // The button disappears with the limit; hand focus to the field so keyboard users aren't dropped on <body>.
          // Keyboard activation only (detail 0): on a tap, focusing the field would pop up the phone keyboard.
          onClick={(e) => {
            onChange(null)
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
