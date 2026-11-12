// Create or edit one category: a Dialog on the desktop, a bottom sheet on the phone. The caller keys it per opening,
// so every open starts from the category (or a fresh draft) instead of the last attempt's leftovers.
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Sheet,
  SheetClose,
  Spinner,
} from '@postxl/ui-components'
import { BottomSheet } from '../BottomSheet'
import { CategoryColorPicker } from './CategoryColorPicker'
import { useCategories } from '../../catalog/CatalogProvider'
import { useCategoryActions } from '../../catalog/useCategoryActions'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { firstFreeColor } from '../../lib/categoryColor'
import { errorMessage } from '../../lib/errorMessage'
import type { UserCategory } from '../../api/protocol'

const NAME_MAX = 60
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
  const { list } = useCategories()
  const actions = useCategoryActions()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(category?.name ?? '')
  // The picker reports every drag step; the colour is only saved with the form.
  const [color, setColor] = useState(() => category?.color ?? firstFreeColor(list))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // State lags a fast double submit; the ref doesn't.
  const inFlight = useRef(false)

  const trimmed = name.trim()
  const title = category ? 'Kategorie bearbeiten' : 'Neue Kategorie'

  const onOpenChange = (next: boolean) => {
    // Closing mid-request would leave the save running behind a closed dialog.
    if (!next && !pending) onClose()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (trimmed === '' || inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      if (category) {
        // PUT replaces everything: the derived-colour overrides go back as they were.
        await actions.update(category.id, {
          name: trimmed,
          color,
          colorLight: category.colorLight,
          colorDark: category.colorDark,
        })
      } else {
        await actions.create({ name: trimmed, color, colorLight: null, colorDark: null })
      }
      setPending(false)
      inFlight.current = false
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Speichern fehlgeschlagen'))
      setPending(false)
      inFlight.current = false
    }
  }

  // The sheet's first focusable is its ✕, so focus the name explicitly in both variants.
  const onOpenAutoFocus = (e: Event) => {
    e.preventDefault()
    inputRef.current?.focus()
  }

  const fields = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>Name</Label>
        <Input
          ref={inputRef}
          id={inputId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          required
          autoComplete="off"
        />
      </div>
      <CategoryColorPicker
        value={color}
        onChange={setColor}
        name={name}
        categories={list}
        exceptId={category?.id}
      />
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )

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
      disabled={trimmed === ''}
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
          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
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
        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
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
