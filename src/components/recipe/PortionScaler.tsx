import { Minus, Plus } from 'lucide-react'
import { Button, DeferredNumberInput, cn } from '@postxl/ui-components'
import { TagText } from '../TagText'

// The portion-scaling field in the recipe meta row. Two modes off one set of
// pieces so nothing reflows as the value changes:
//   • portions-mode (sizeNumber set): the box is the desired portion count and
//     factor = desired / sizeNumber.
//   • multiplier-mode (sizeNumber null): the box is the × factor itself, marked
//     with a leading "×".
// The factor lives in RecipeDetail. DeferredNumberInput buffers the edit locally
// and commits on blur/Enter, so the field can be cleared while typing (a plain
// controlled NumberInput would snap the default back). Steppers are our own —
// the app hides native number spinners globally (styles.css).
//
// `part` lets the caller split the pieces across two rows: portions-mode keeps
// the box up in the meta row (`input`) and drops its steppers into the
// Koch-Modus tools row (`steppers`); multiplier-mode renders everything together
// (`full`).
export function PortionScaler({
  factor,
  onChange,
  sizeNumber,
  sizeText,
  part = 'full',
}: {
  factor: number
  onChange: (factor: number) => void
  sizeNumber: number | null
  sizeText: string | null
  part?: 'full' | 'input' | 'steppers'
}) {
  const portions = sizeNumber !== null
  const base = sizeNumber ?? 1
  const current = round2(portions ? factor * base : factor)

  // Map a box value back to a factor: portions divide by the base, the
  // multiplier is the factor itself.
  const apply = (value: number) => onChange(portions ? value / base : value)
  // Commit (blur/Enter): empty / 0 → reset to default; negative → ignore.
  const commit = (value: number | null) => {
    if (value === null || value === 0) return onChange(1)
    if (value < 0) return
    apply(value)
  }
  // Portions step whole counts (floor 1). The multiplier steps 0.5 at/above ×1
  // and 0.25 below it (…0.25, 0.5, 0.75, 1, 1.5, 2…), floored at ×0.25.
  const stepUp = () => apply(portions ? current + 1 : round2(current + (current < 1 ? 0.25 : 0.5)))
  const stepDown = () =>
    apply(portions ? Math.max(1, current - 1) : Math.max(0.25, round2(current - (current <= 1 ? 0.25 : 0.5))))
  const canDecrement = portions ? current > 1 : current > 0.25

  // Phones get 40 px tap targets (docs/design.md §7); desktop keeps the compact iconSm.
  const stepperClass = 'rounded-md text-muted-foreground hover:text-foreground max-[760px]:size-10'

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
    <Button type="button" variant="ghost" size="iconSm" onClick={stepUp} aria-label="Mehr" className={stepperClass}>
      <Plus className="size-4" />
    </Button>
  )

  const input = (
    <DeferredNumberInput
      value={current}
      onCommit={commit}
      min={0}
      aria-label={portions ? 'Portionen' : 'Mengen-Faktor'}
      // Outline + shadow only on hover; the border width stays put (transparent
      // → visible) so nothing shifts. Focus still shows its ring.
      wrapperClassName="h-7 w-12 shrink-0 border-transparent shadow-none transition-[color,box-shadow] hover:border-input hover:shadow-xs"
      // Portions match the meta-row size text (text-xl); the multiplier sits a
      // notch smaller (text-lg, like its "×"). Input ships a `md:text-sm` that
      // would shrink the value on desktop; override at the same breakpoint.
      // bg-transparent so the field matches the wrapper (the lib otherwise leaves
      // dark:bg-input/30 on the input).
      className={cn(
        'bg-transparent px-0.5 text-center tabular-nums dark:bg-transparent',
        portions ? 'text-xl md:text-xl' : 'text-lg md:text-lg',
      )}
    />
  )

  if (part === 'input') {
    return (
      <div className="inline-flex items-center gap-1">
        {input}
        {/* Only portions-mode carries its label inline; in multiplier-mode the
            size descriptor lives in the meta row above the stepper. */}
        {portions && sizeText && (
          <span className="ml-0.5 text-xl">
            <TagText value={sizeText} size="md" />
          </span>
        )}
      </div>
    )
  }

  const steppers = (
    // In multiplier-mode a little air sets the steppers off from the value; the
    // gap between − and + itself stays the same as the standalone portions ones. On phones the
    // 40 px buttons outgrow the row's 32 px toggles: the negative margin keeps the row height, and
    // their own padding replaces gap and air so the size column (and the 1fr column next to it)
    // keeps its width.
    <div
      className={cn(
        'inline-flex items-center gap-1 max-[760px]:-my-1 max-[760px]:gap-0',
        part === 'full' && 'ml-2 max-[760px]:ml-0',
      )}
    >
      {minus}
      {plus}
    </div>
  )

  if (part === 'steppers') {
    return steppers
  }

  // full — multiplier-mode: the "×" leads (close to the value), then the value,
  // then the ±steppers set a touch apart from it.
  return (
    <div className="inline-flex items-center">
      {!portions && <span className="mr-1 text-lg text-muted-foreground">×</span>}
      {input}
      {steppers}
    </div>
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
