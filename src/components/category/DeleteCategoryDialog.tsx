// Confirm deleting a category (pattern: DeleteRecipeButton), opened from the row's ⋮ menu, so it is controlled
// instead of owning a trigger.
import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Spinner,
} from '@postxl/ui-components'
import { useCategoryActions } from '../../catalog/useCategoryActions'
import { errorMessage } from '../../lib/errorMessage'
import type { UserCategory } from '../../api/protocol'

export function DeleteCategoryDialog({
  open,
  onClose,
  category,
  onCloseAutoFocus,
}: {
  open: boolean
  onClose: () => void
  category: UserCategory
  onCloseAutoFocus?: (e: Event) => void
}) {
  const { remove } = useCategoryActions()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // State lags a fast double click; the ref doesn't.
  const inFlight = useRef(false)

  const onOpenChange = (next: boolean) => {
    // Closing mid-request would leave the delete running behind a closed dialog.
    if (!next && !pending) onClose()
  }

  const onConfirm = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      await remove(category.id)
      onClose()
    } catch (e) {
      setError(errorMessage(e, 'Löschen fehlgeschlagen'))
    } finally {
      setPending(false)
      inFlight.current = false
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>„{category.name}“ löschen?</AlertDialogTitle>
          <AlertDialogDescription>Die Rezepte bleiben erhalten, nur die Sammlung verschwindet.</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction: a failed delete has to keep the dialog open for the error.
              aria-disabled instead of disabled keeps focus on the button while pending. */}
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            aria-disabled={pending}
            className="gap-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            {pending && <Spinner className="size-4" />}
            Löschen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
