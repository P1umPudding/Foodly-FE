import { useState } from 'react'
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
  buttonVariants,
  cn,
} from '@postxl/ui-components'
import { foodly } from '../../api'
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

  const onOpenChange = (next: boolean) => {
    // Closing mid-request would leave the delete running behind a closed dialog.
    if (pending) return
    if (next) setError(null)
    setOpen(next)
  }

  const onConfirm = async () => {
    setPending(true)
    setError(null)
    try {
      await foodly.deleteRecipe(recipeId)
      onDeleted()
    } catch (e) {
      setError((e as Error).message)
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* The trigger is styled via buttonVariants rather than wrapping a postxl Button: Button isn't
              forwardRef, so neither the tooltip nor the dialog's focus return could reach it. */}
          <AlertDialogTrigger
            aria-label="Löschen"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 max-[760px]:size-10')}
          >
            <Trash2 className="h-4 w-4" />
            <span className="max-[760px]:hidden">Löschen</span>
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
              delete has to keep it open to show the error. */}
          <Button variant="destructive" onClick={onConfirm} disabled={pending} className="gap-1.5">
            {pending && <Spinner className="size-4" />}
            Löschen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
