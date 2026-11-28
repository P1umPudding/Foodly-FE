import { useRef, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button, Textarea, toast } from '@postxl/ui-components'
import { foodly } from '../../api'
import { MY_NOTE_MAX } from '../../api/myNotes'
import type { RecipeId } from '../../api/protocol'
import { useRequest } from '../../hooks/useRequest'
import { useAutosave } from '../../editor/useAutosave'
import { DemoHint } from '../DemoHint'
import { SaveStatusIndicator } from '../editor/SaveStatus'

// "Meine Notiz" below the steps: private per user (any role, viewers included), edited inline with autosave.
export function MyNote({ recipeId }: { recipeId: RecipeId }) {
  const loaded = useRequest(() => foodly.getMyNote(recipeId), [recipeId])
  // Local copy of the stored note: the request's data isn't updated after a save.
  const [saved, setSaved] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  if (loaded.status === 'loading') return null
  if (loaded.status === 'error') {
    return (
      <MyNoteSection>
        <p role="alert" className="text-sm text-destructive">
          Notiz konnte nicht geladen werden: {loaded.error?.message}
        </p>
      </MyNoteSection>
    )
  }

  const note = saved ?? loaded.data ?? ''
  if (editing) {
    return (
      <MyNoteSection>
        <NoteEditor
          recipeId={recipeId}
          initial={note}
          onDone={(text) => {
            setSaved(text.trim() === '' ? '' : text)
            setEditing(false)
          }}
        />
      </MyNoteSection>
    )
  }

  return (
    <MyNoteSection>
      {note.trim() === '' ? (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
          <Plus className="size-4" aria-hidden />
          Notiz hinzufügen
        </Button>
      ) : (
        <>
          <p className="text-base whitespace-pre-wrap text-foreground">{note}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing(true)}>
            Bearbeiten
          </Button>
        </>
      )}
    </MyNoteSection>
  )
}

function MyNoteSection({ children }: { children: ReactNode }) {
  return (
    <section className="mt-10" aria-labelledby="my-note-title">
      <h2
        id="my-note-title"
        // 19 px matches the section titles (SectionBlock), no token.
        className="mb-3 font-display text-[19px] leading-tight text-foreground"
      >
        Meine Notiz
      </h2>
      {children}
      <div className="mt-2">
        <DemoHint feature="myNotes" />
      </div>
    </section>
  )
}

// Mounted only once the note has loaded: useAutosave adopts its first value as the baseline, so opening the editor
// never writes the loaded note back.
function NoteEditor({
  recipeId,
  initial,
  onDone,
}: {
  recipeId: RecipeId
  initial: string
  onDone: (text: string) => void
}) {
  const [draft, setDraft] = useState(initial)
  // "Fertig" shows what was saved, including keystrokes typed while its flush ran.
  const latest = useRef(draft)
  latest.current = draft
  const { status, retry, flush } = useAutosave(draft, (text) => foodly.setMyNote(recipeId, text), {
    // Leaving the page (or signing out) mid-edit saves on unmount, where no status line is left to show a failure.
    onFlushError: () => toast.error('Notiz konnte nicht gespeichert werden.'),
  })

  return (
    <>
      <Textarea
        aria-label="Meine Notiz"
        rows={4}
        maxLength={MY_NOTE_MAX}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          onClick={() => {
            // A failed save keeps the editor open; the status shows the error and offers a retry.
            void flush().then(
              () => onDone(latest.current),
              () => {},
            )
          }}
        >
          Fertig
        </Button>
        {status.state !== 'idle' && <SaveStatusIndicator status={status} onRetry={retry} />}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {draft.length} / {MY_NOTE_MAX}
        </span>
      </div>
    </>
  )
}
