import { useRef } from 'react'
import { cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@postxl/ui-components'
import { ArrowDown, ArrowUp, Ellipsis, EllipsisVertical, Trash2 } from 'lucide-react'
import { TriggerButton } from '../TriggerButton'

// Moving and removing a row behind one menu (mockup `.ed-note`, `.ed-ing`, `.ed-step`, `.ed-sec-h`): ⋮ on rows,
// ⋯ on section heads. Drag & drop is deliberately not implemented, so there is no grip either.
export function RowMenu({
  label,
  icon = 'vertical',
  canMoveUp,
  canMoveDown,
  onUp,
  onDown,
  onRemove,
  onRemovedFocus,
  className,
}: {
  label: string
  icon?: 'vertical' | 'horizontal'
  canMoveUp: boolean
  canMoveDown: boolean
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  // After "Entfernen" the trigger is gone; without a target Radix would drop focus on the page.
  onRemovedFocus?: () => void
  className?: string
}) {
  const removed = useRef(false)
  const Icon = icon === 'vertical' ? EllipsisVertical : Ellipsis
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <TriggerButton
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn('size-[30px] touch:size-10', className)}
        >
          <Icon className="size-4" />
        </TriggerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(e) => {
          if (removed.current && onRemovedFocus) {
            e.preventDefault()
            onRemovedFocus()
          }
          removed.current = false
        }}
      >
        <DropdownMenuItem className="gap-2" disabled={!canMoveUp} onSelect={onUp}>
          <ArrowUp className="size-4" />
          Nach oben
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" disabled={!canMoveDown} onSelect={onDown}>
          <ArrowDown className="size-4" />
          Nach unten
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className="gap-2"
          onSelect={() => {
            removed.current = true
            onRemove()
          }}
        >
          <Trash2 className="size-4" />
          Entfernen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
