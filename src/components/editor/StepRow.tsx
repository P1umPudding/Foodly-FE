import { Textarea } from '@postxl/ui-components'
import { RowActions } from './RowActions'

export function StepRow({
  index,
  text,
  onChange,
  onUp,
  onDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  index: number
  text: string
  onChange: (text: string) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-2 grid size-5 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">
        {index + 1}
      </span>
      <Textarea
        aria-label={`Schritt ${index + 1}`}
        className="min-h-14 flex-1"
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
      <RowActions
        onUp={onUp}
        onDown={onDown}
        onRemove={onRemove}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        removeLabel={`Schritt ${index + 1} entfernen`}
      />
    </div>
  )
}
