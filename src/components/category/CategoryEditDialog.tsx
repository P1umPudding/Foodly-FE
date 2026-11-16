// Edit one category in a Dialog on the desktop, a bottom sheet on the phone (the category's page; /categories edits
// inline). The caller keys it per opening, see useCategoryDraft.
import { useRef, type ReactNode } from 'react'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetClose,
  Spinner,
} from '@postxl/ui-components'
import { BottomSheet } from '../BottomSheet'
import { CategoryFormFields, useCategoryDraft } from './CategoryForm'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import type { UserCategory } from '../../api/protocol'
const DESCRIPTION = 'Name und Farbe der Kategorie'

export function CategoryEditDialog({
  open,
  onClose,
  category,
  onCloseAutoFocus,
}: {
  open: boolean
  onClose: () => void
  // null: create a new one
  category: UserCategory | null
  onCloseAutoFocus?: (e: Event) => void
}) {
  const isDesktop = useIsDesktop()
  const inputRef = useRef<HTMLInputElement>(null)
  const draft = useCategoryDraft(category, onClose)
  const { pending } = draft
  const title = category ? 'Kategorie bearbeiten' : 'Neue Kategorie'

  const onOpenChange = (next: boolean) => {
    // Closing mid-request would leave the save running behind a closed dialog.
    if (!next && !pending) onClose()
  }

  // The sheet's first focusable is its ✕, so focus the name explicitly in both variants.
  const onOpenAutoFocus = (e: Event) => {
    e.preventDefault()
    inputRef.current?.focus()
  }

  const fields = <CategoryFormFields draft={draft} inputRef={inputRef} />

  // Button wraps the Close, not the other way round: the postxl Button doesn't forwardRef.
  const cancel = (Close: typeof DialogClose | typeof SheetClose): ReactNode => (
    <Button asChild variant="outline">
      <Close disabled={pending}>Abbrechen</Close>
    </Button>
  )

  // aria-disabled instead of disabled while saving keeps focus on the button (see DeleteRecipeButton).
  const save = (
    <Button
      type="submit"
      disabled={!draft.canSave}
      aria-disabled={pending}
      className="gap-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50"
    >
      {pending && <Spinner className="size-4" />}
      Speichern
    </Button>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* No built-in ✕: it carries a native title tooltip; „Abbrechen“ and Escape close the dialog. */}
        <DialogContent showCloseButton={false} onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={onCloseAutoFocus}>
          <form onSubmit={(e) => void draft.submit(e)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="sr-only">{DESCRIPTION}</DialogDescription>
            </DialogHeader>
            {fields}
            <DialogFooter>
              {cancel(DialogClose)}
              {save}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <BottomSheet
        title={title}
        description={DESCRIPTION}
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <form onSubmit={(e) => void draft.submit(e)} className="flex flex-col gap-4">
          {fields}
          <div className="flex justify-end gap-2">
            {cancel(SheetClose)}
            {save}
          </div>
        </form>
      </BottomSheet>
    </Sheet>
  )
}
