// "Mehrere einfügen" (#249): paste a list, one ingredient per line, split by parseIngredientList. A Dialog on the
// desktop, a bottom sheet on the phone. The caller keys it per opening, so every open starts with an empty field.
import { useState, type FormEvent, type ReactNode } from 'react'
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
  Textarea,
} from '@postxl/ui-components'
import { BottomSheet } from '../BottomSheet'
import { useIngredients } from '../../catalog/CatalogProvider'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { parseIngredientList, type ParsedIngredient } from '../../editor/ingredientLine'

const TITLE = 'Mehrere Zutaten einfügen'
const HINT = 'Eine Zutat pro Zeile.'
const PLACEHOLDER = ['500 g Hackfleisch', 'ca. 800 g Tomaten (gehackt)', 'Salz nach Geschmack', '2 EL Olivenöl'].join(
  '\n',
)

export function PasteIngredientsDialog({
  open,
  onClose,
  onInsert,
  onCloseAutoFocus,
}: {
  open: boolean
  onClose: () => void
  onInsert: (rows: ParsedIngredient[]) => void
  onCloseAutoFocus?: (e: Event) => void
}) {
  const isDesktop = useIsDesktop()
  const { byId } = useIngredients()
  const [text, setText] = useState('')
  const empty = text.trim() === ''

  const onOpenChange = (next: boolean) => {
    if (!next) onClose()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (empty) return
    onInsert(parseIngredientList(text, Object.values(byId)))
    onClose()
  }

  // The postxl Textarea doesn't forward its ref, and the sheet's first focusable is its ✕: find the field instead.
  // Radix fires this event on the content element itself, hence currentTarget.
  const onOpenAutoFocus = (e: Event) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).querySelector('textarea')?.focus()
  }

  const field = (
    <Textarea
      aria-label="Zutaten, eine pro Zeile"
      rows={8}
      placeholder={PLACEHOLDER}
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  )

  // Button wraps the Close, not the other way round: the postxl Button doesn't forwardRef.
  const cancel = (Close: typeof DialogClose | typeof SheetClose): ReactNode => (
    <Button asChild variant="outline">
      <Close>Abbrechen</Close>
    </Button>
  )
  const insert = (
    <Button type="submit" disabled={empty}>
      Einfügen
    </Button>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* No built-in ✕: it carries a native title tooltip; „Abbrechen“ and Escape close the dialog. */}
        <DialogContent showCloseButton={false} onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={onCloseAutoFocus}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{TITLE}</DialogTitle>
              <DialogDescription>{HINT}</DialogDescription>
            </DialogHeader>
            {field}
            <DialogFooter>
              {cancel(DialogClose)}
              {insert}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <BottomSheet
        title={TITLE}
        description={HINT}
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Visible copy of the sheet's sr-only description, hidden from screen readers so it isn't read twice. */}
          <p aria-hidden className="text-sm text-muted-foreground">
            {HINT}
          </p>
          {field}
          <div className="flex justify-end gap-2">
            {cancel(SheetClose)}
            {insert}
          </div>
        </form>
      </BottomSheet>
    </Sheet>
  )
}
