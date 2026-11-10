import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@postxl/ui-components'
import { TriggerButton } from '../TriggerButton'
import { foodly } from '../../api'
import { errorMessage } from '../../lib/errorMessage'
import type { RecipeId } from '../../api/protocol'

export function DeleteRecipeButton({
  recipeId,
  name,
  onDeleted,
}: {
  recipeId: RecipeId
  name: string
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // State lags a fast double click; the ref doesn't.
  const inFlight = useRef(false)

  const onOpenChange = (next: boolean) => {
    // Closing mid-request would leave the delete running behind a closed dialog.
    if (pending) return
    if (next) setError(null)
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
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <TriggerButton variant="outline" size="sm" aria-label="Löschen" className="gap-1.5 phone:size-10">
              <Trash2 className="h-4 w-4" />
              <span className="phone:hidden">Löschen</span>
            </TriggerButton>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Rezept löschen</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
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
            onClick={onConfirm}
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
