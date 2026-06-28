import { useEffect, useRef, useState } from 'react'
import { Scale, X } from 'lucide-react'
import { Button, Input, Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'

// The portion-scaling pill in the Koch-Modus control row. Three states driven by
// `factor` + a local `editing` flag: rest (× 1), active (× <factor>), and an
// inline edit field. Owns no state beyond the edit buffer — the factor lives in
// RecipeDetail.
export function PortionScaler({ factor, onChange }: { factor: number; onChange: (factor: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // Escape cancels by leaving edit mode, which unmounts the focused input and
  // fires its blur → commit. This flag makes that trailing commit a no-op so a
  // cancelled draft is never applied.
  const cancelled = useRef(false)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const startEdit = () => {
    cancelled.current = false
    setDraft(formatFactor(factor))
    setEditing(true)
  }

  // Reset rules per spec §2: empty / 0 / 1 → ×1; a valid positive number → set it;
  // negative / NaN / otherwise invalid → ignore, keep the current factor.
  const commit = () => {
    setEditing(false)
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    const trimmed = draft.trim()
    if (trimmed === '') return onChange(1)
    const n = Number(trimmed.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) return
    onChange(n === 0 ? 1 : n)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') {
            cancelled.current = true
            setEditing(false)
          }
        }}
        aria-label="Mengen-Faktor"
        // Input ships a `md:text-sm` that would shrink the value on desktop; override
        // at the same breakpoint so the typed factor matches the pill's size.
        className="h-10 w-24 text-xl md:text-xl"
      />
    )
  }

  if (factor === 1) {
    return (
      <Tooltip>
        {/* span wrapper: postxl Button isn't forwardRef, so the tooltip can only
            anchor to a host element — without it the tooltip never shows. */}
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startEdit}
              className="gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
            >
              <Scale className="size-5" />
              <span className="text-xl tabular-nums">× 1</span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Mengen skalieren</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="group inline-flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startEdit}
              className="gap-1.5 rounded-full text-foreground"
            >
              <Scale className="size-5 text-primary" />
              <span className="text-xl tabular-nums">× {formatFactor(factor)}</span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Mengen skalieren</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={() => onChange(1)}
              aria-label="Skalierung zurücksetzen"
              className={cn(
                'ml-0.5 rounded-full text-muted-foreground hover:text-foreground',
                'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
              )}
            >
              <X className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Zurücksetzen</TooltipContent>
      </Tooltip>
    </div>
  )
}

function formatFactor(factor: number): string {
  return String(Math.round(factor * 100) / 100).replace('.', ',')
}
