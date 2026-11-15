import { Textarea } from '@postxl/ui-components'
import { RowMenu } from './RowMenu'

// Mockup `.ed-step`: grey number, a two-line field without resize grip (audit E10, E11), ⋮ menu.
export function StepRow({
  index,
  text,
  onChange,
  onUp,
  onDown,
  onRemove,
  onRemovedFocus,
  canMoveUp,
  canMoveDown,
}: {
  index: number
  text: string
  onChange: (text: string) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  onRemovedFocus?: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_30px] items-start gap-2 touch:grid-cols-[28px_minmax(0,1fr)_40px]">
      <span className="mt-2 grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
        {index + 1}
      </span>
      <Textarea
        aria-label={`Schritt ${index + 1}`}
        rows={2}
        className="min-h-0 resize-none"
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
      <RowMenu
        label={`Schritt ${index + 1}: Aktionen`}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onUp={onUp}
        onDown={onDown}
        onRemove={onRemove}
        onRemovedFocus={onRemovedFocus}
      />
    </div>
  )
}
