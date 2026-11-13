import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button, NumberInput, cn } from '@postxl/ui-components'
import { hasPortions } from '../../api/views'
import { FACTOR_SERIES, clampServings, snapFactor, stepFactor, stepServings } from '../../cook/size'
import { TagText } from '../TagText'

// The size stepper in the detail action row: [−] value label [+]. Two modes:
//   • portions-mode (sizeNumber > 0, see hasPortions): the box is the desired portion count and
//     factor = desired / sizeNumber. Whole counts ≥ 1 only.
//   • multiplier-mode (otherwise): the box is the × factor itself, marked with a leading "×", limited to the
//     series ×¼ … ×2.
// Both limits match what src/cook/size.ts accepts from the URL, so every value set here survives a reload.
// The factor lives in the URL (RecipeDetail). The box buffers the edit in `draft` and commits on blur/Enter, so
// it can be cleared while typing; afterwards it always shows the applied value again, even when the factor
// didn't change (the lib's DeferredNumberInput only re-syncs when its value prop changes, #71). Steppers are our
// own — the app hides native number spinners globally (styles.css).
export function PortionScaler({
  factor,
  onChange,
  sizeNumber,
  sizeText,
}: {
  factor: number
  onChange: (factor: number) => void
  sizeNumber: number | null
  sizeText: string | null
}) {
  const portions = hasPortions(sizeNumber)
  const base = portions && sizeNumber !== null ? sizeNumber : 1
  const current = round2(portions ? factor * base : factor)
  // A pending edit is dropped once the applied value changes from outside
  // (steppers, reset), so a later blur can't overwrite that change and stepping
  // back doesn't revive it. `typed` null = the box was cleared.
  const [draft, setDraft] = useState<{ typed: number | null; over: number } | null>(null)
  if (draft && draft.over !== current) setDraft(null)

  // Map a box value back to a factor: portions divide by the base, the
  // multiplier is the factor itself.
  const apply = (value: number) => onChange(portions ? value / base : value)
  // Commit (blur/Enter): negative or non-finite → ignore; empty / 0 → reset to default. So the factor never
  // becomes 0 or NaN (both would show as amounts). Otherwise snap to an allowed value first, then ignore it when
  // it is the shown one, so 4.001 or ×1.6 at ×1.5 doesn't quietly rescale.
  const commit = (value: number | null) => {
    if (value !== null && (value < 0 || !Number.isFinite(value))) return
    if (value === null || round2(value) === 0) return onChange(1)
    if (round2(value) === current) return
    const allowed = portions ? clampServings(value) : snapFactor(value)
    if (allowed === current) return
    apply(allowed)
  }
  const finishEdit = () => {
    if (draft) commit(draft.typed)
    setDraft(null)
  }
  const stepUp = () => apply(portions ? stepServings(current, 1) : stepFactor(current, 1))
  const stepDown = () => apply(portions ? stepServings(current, -1) : stepFactor(current, -1))
  const canIncrement = portions || current < FACTOR_SERIES[FACTOR_SERIES.length - 1]
  const canDecrement = portions ? current > 1 : current > FACTOR_SERIES[0]

  // Phones get 40 px tap targets (docs/design.md §7); desktop keeps the compact iconSm.
  const stepperClass = 'rounded-md text-muted-foreground hover:text-foreground phone:size-10'

  const minus = (
    <Button
      type="button"
      variant="ghost"
      size="iconSm"
      onClick={stepDown}
      disabled={!canDecrement}
      aria-label="Weniger"
      className={stepperClass}
    >
      <Minus className="size-4" />
    </Button>
  )

  const plus = (
    <Button
      type="button"
      variant="ghost"
      size="iconSm"
      onClick={stepUp}
      disabled={!canIncrement}
      aria-label="Mehr"
      className={stepperClass}
    >
      <Plus className="size-4" />
    </Button>
  )

  const input = (
    <NumberInput
      value={draft ? (draft.typed ?? undefined) : current}
      onChange={(value) => setDraft({ typed: value ?? null, over: current })}
      // Replaces NumberInput's own onBlur (it spreads props last); that one only
      // matters with a `format`, which this box doesn't use.
      onBlur={finishEdit}
      onEnter={finishEdit}
      min={0}
      aria-label={portions ? 'Portionen' : 'Mengen-Faktor'}
      // Outline + shadow only on hover; the border width stays put (transparent
      // → visible) so nothing shifts. Focus still shows its ring.
      wrapperClassName="h-7 w-10 shrink-0 border-transparent shadow-none transition-[color,box-shadow] hover:border-input hover:shadow-xs"
      // Input ships a `md:text-sm` that would shrink the value on desktop; override at the same breakpoint.
      // bg-transparent so the field matches the wrapper (the lib otherwise leaves dark:bg-input/30 on the input).
      className="bg-transparent px-0.5 text-center text-base font-semibold tabular-nums md:text-base dark:bg-transparent"
    />
  )

  return (
    <div className="inline-flex items-center gap-1 phone:gap-0">
      {minus}
      <span className="inline-flex items-center gap-1 px-1 text-base">
        {!portions && <span className="font-semibold">×</span>}
        {input}
        {sizeText && (
          <span className={cn(!portions && 'text-muted-foreground')}>
            <TagText value={sizeText} size="md" />
          </span>
        )}
      </span>
      {plus}
    </div>
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
