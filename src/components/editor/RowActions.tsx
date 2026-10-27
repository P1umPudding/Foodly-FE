import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

// The up/down/trash trio shared by ingredients, steps, notes and sections.
// Drag & drop is deliberately not implemented (see the plan's scope notes).
export function RowActions({
  onUp,
  onDown,
  onRemove,
  canMoveUp,
  canMoveDown,
  removeLabel,
}: {
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  removeLabel: string
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button variant="ghost" size="sm" onClick={onUp} disabled={!canMoveUp} aria-label="Nach oben">
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDown} disabled={!canMoveDown} aria-label="Nach unten">
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label={removeLabel}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{removeLabel}</TooltipContent>
      </Tooltip>
    </div>
  )
}
