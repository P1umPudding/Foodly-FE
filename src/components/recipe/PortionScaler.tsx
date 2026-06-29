import { Minus, Plus, RotateCcw } from 'lucide-react'
import { Button, DeferredNumberInput, Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { TagText } from '../TagText'

// The portion-scaling field in the recipe meta row. Two modes off one layout so
// it never reflows as its value changes:
//   • portions-mode (sizeNumber set): the box is the desired portion count and
//     factor = desired / sizeNumber.
//   • multiplier-mode (sizeNumber null): the box is the × factor itself, shown
//     with an "x" suffix.
// The factor lives in RecipeDetail. DeferredNumberInput buffers the edit locally
// and commits on blur/Enter, so the field can be cleared while typing (a plain
// controlled NumberInput would snap the default back). Steppers are our own —
// the app hides native number spinners globally (styles.css).
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
  const portions = sizeNumber !== null
  const base = sizeNumber ?? 1
  const current = round2(portions ? factor * base : factor)
  const isDefault = portions ? current === base : current === 1

  const reset = () => onChange(1)
  // Map a box value back to a factor: portions divide by the base, the
  // multiplier is the factor itself.
  const apply = (value: number) => onChange(portions ? value / base : value)
  const step = (delta: number) => apply(Math.max(1, round2(current + delta)))
  // Commit (blur/Enter): empty / 0 → reset to default; negative → ignore.
  const commit = (value: number | null) => {
    if (value === null || value === 0) return reset()
    if (value < 0) return
    apply(value)
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        onClick={() => step(-1)}
        disabled={current <= 1}
        aria-label="Weniger"
        className="rounded-full"
      >
        <Minus className="size-4" />
      </Button>

      <DeferredNumberInput
        value={current}
        onCommit={commit}
        min={0}
        suffix={portions ? undefined : 'x'}
        aria-label={portions ? 'Portionen' : 'Mengen-Faktor'}
        wrapperClassName={cn('h-9 shrink-0', portions ? 'w-14' : 'w-16')}
        // Input ships a `md:text-sm` that would shrink the value on desktop;
        // override at the same breakpoint. bg-transparent so the field matches
        // the wrapper (the lib otherwise leaves dark:bg-input/30 on the input).
        className="bg-transparent text-center text-xl tabular-nums md:text-xl dark:bg-transparent"
      />

      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        onClick={() => step(1)}
        aria-label="Mehr"
        className="rounded-full"
      >
        <Plus className="size-4" />
      </Button>

      {/* Only portions-mode carries its label inline; in multiplier-mode the
          size descriptor lives in the meta row above this stepper. */}
      {portions && sizeText && (
        <span className="ml-0.5 text-xl">
          <TagText value={sizeText} size="md" />
        </span>
      )}

      {/* Always rendered so it reserves its slot, but `invisible` at default so
          it neither shows nor hit-tests (opacity-0 would still trigger the
          tooltip on hover). */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('ml-0.5 inline-flex', isDefault && 'invisible')}>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={reset}
              aria-label="Skalierung zurücksetzen"
              tabIndex={isDefault ? -1 : 0}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Zurücksetzen</TooltipContent>
      </Tooltip>
    </div>
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
