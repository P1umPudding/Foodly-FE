// The "Rezept löschen?" confirmation. Opened from the detail header's ⋯ menu; `onCloseAutoFocus` lets the opener put
// focus back on its trigger (the menu item that opened it is gone by then).
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
import { foodly } from '../../api'
import { errorMessage } from '../../lib/errorMessage'
import type { RecipeId } from '../../api/protocol'

export function DeleteRecipeDialog({
  open,
  onOpenChange: setOpen,
  recipeId,
  name,
  onDeleted,
  onCloseAutoFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipeId: RecipeId
  name: string
  onDeleted: () => void
  onCloseAutoFocus?: (e: Event) => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // State lags a fast double click; the ref doesn't.
  const inFlight = useRef(false)

  const onOpenChange = (next: boolean) => {
    // Closing mid-request would leave the delete running behind a closed dialog.
    if (pending) return
    // The dialog is opened from outside (no trigger here), so a stale error is cleared on the way out.
    if (!next) setError(null)
    setOpen(next)
  }

  const onConfirm = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      await foodly.deleteRecipe(recipeId)
      onDeleted()
    } catch (e) {
      setError(errorMessage(e, 'Löschen fehlgeschlagen'))
      setPending(false)
      inFlight.current = false
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Rezept löschen?</AlertDialogTitle>
          <AlertDialogDescription>„{name}“ wird endgültig gelöscht.</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction: the action closes the dialog on click, but a failed
              delete has to keep it open to show the error. aria-disabled instead of disabled keeps
              focus on the button while pending; a disabled button would drop it out of the dialog. */}
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
