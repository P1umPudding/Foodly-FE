import { useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Textarea,
} from '@postxl/ui-components'
import { ArrowDown, ArrowUp, EllipsisVertical, Plus, Trash2 } from 'lucide-react'
import { TriggerButton } from '../TriggerButton'
import { move, newNote } from '../../editor/draft'
import type { DraftNote } from '../../editor/draft'

// Notes in the editor's side column: a two-line field per note, moving and removing behind ⋮ (mockup `.ed-note`).
export function NotesEditor({ notes, onChange }: { notes: DraftNote[]; onChange: (notes: DraftNote[]) => void }) {
  // After "Entfernen" the menu's trigger is gone; focus goes to "+ Notiz" instead of the page.
  const addButton = useRef<HTMLButtonElement>(null)
  return (
    <>
      {notes.map((note, i) => (
        <div
          key={note.key}
          className="mb-1.5 grid grid-cols-[minmax(0,1fr)_30px] items-start gap-1 touch:grid-cols-[minmax(0,1fr)_40px]"
        >
          <Textarea
            aria-label={`Notiz ${i + 1}`}
            rows={2}
            className="min-h-0 resize-none"
            value={note.text}
            onChange={(e) => onChange(notes.map((n) => (n.key === note.key ? { ...n, text: e.target.value } : n)))}
          />
          <NoteMenu
            label={`Notiz ${i + 1}: Aktionen`}
            canMoveUp={i > 0}
            canMoveDown={i < notes.length - 1}
            onUp={() => onChange(move(notes, note.key, -1))}
            onDown={() => onChange(move(notes, note.key, 1))}
            onRemove={() => onChange(notes.filter((n) => n.key !== note.key))}
            onRemovedFocus={() => addButton.current?.focus()}
          />
        </div>
      ))}
      <TriggerButton
        ref={addButton}
        variant="ghost"
        size="sm"
        className="gap-1.5 self-start text-muted-foreground touch:h-10"
        onClick={() => onChange([...notes, newNote()])}
      >
        <Plus className="size-4" />
        Notiz
      </TriggerButton>
    </>
  )
}

function NoteMenu({
  label,
  canMoveUp,
  canMoveDown,
  onUp,
  onDown,
  onRemove,
  onRemovedFocus,
}: {
  label: string
  canMoveUp: boolean
  canMoveDown: boolean
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  onRemovedFocus: () => void
}) {
  const removed = useRef(false)
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <TriggerButton variant="ghost" size="icon" aria-label={label} className="size-[30px] touch:size-10">
          <EllipsisVertical className="size-4" />
        </TriggerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(e) => {
          if (removed.current) {
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
