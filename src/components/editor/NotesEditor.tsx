import { useRef } from 'react'
import { Textarea } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { TriggerButton } from '../TriggerButton'
import { RowMenu } from './RowMenu'
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
          <RowMenu
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
