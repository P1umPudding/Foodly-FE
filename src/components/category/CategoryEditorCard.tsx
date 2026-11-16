// The mockup's inline editor (`.cat-editor`) under the list on /categories: create or edit one category in place.
// The caller keys it per opening (see useCategoryDraft) and puts focus back once it is gone.
import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { Button, Card, cn } from '@postxl/ui-components'
import { CategoryFormFields, CategorySaveButton, useCategoryDraft } from './CategoryForm'
import { COL_HEAD } from '../editor/EditorSidebar'
import type { UserCategory } from '../../api/protocol'

export function CategoryEditorCard({ category, onClose }: { category: UserCategory | null; onClose: () => void }) {
  const titleId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const draft = useCategoryDraft(category, onClose)
  const { pending } = draft

  useEffect(() => {
    formRef.current?.scrollIntoView?.({ block: 'nearest' })
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  // Like a dialog's Escape. Not mid-save: closing would leave the request running behind a vanished form.
  const onKeyDown = (e: KeyboardEvent) => {
    // isComposing: Escape that cancels an IME composition is not meant for the form.
    if (e.key !== 'Escape' || e.defaultPrevented || e.nativeEvent.isComposing || pending) return
    e.preventDefault()
    onClose()
  }

  return (
    <Card className="mt-2 p-4">
      <form
        ref={formRef}
        aria-labelledby={titleId}
        onSubmit={(e) => void draft.submit(e)}
        onKeyDown={onKeyDown}
        className="flex flex-col"
      >
        <h3 id={titleId} className={cn(COL_HEAD, 'mb-2')}>
          {category ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
        </h3>
        <CategoryFormFields draft={draft} inputRef={inputRef} />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Abbrechen
          </Button>
          <CategorySaveButton draft={draft} />
        </div>
      </form>
    </Card>
  )
}
