// The body of the category form, shared by the inline editor on /categories and the dialog on a category's page:
// the draft with its save, and the fields as in the mockup's `.cat-editor`.
import { useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { Alert, AlertDescription, Input, Label } from '@postxl/ui-components'
import { CategoryColorPicker } from './CategoryColorPicker'
import { CategoryMark } from './CategoryMark'
import { useCategories } from '../../catalog/CatalogProvider'
import { useCategoryActions } from '../../catalog/useCategoryActions'
import { firstFreeColor } from '../../lib/categoryColor'
import { errorMessage } from '../../lib/errorMessage'
import type { UserCategory } from '../../api/protocol'

const NAME_MAX = 60

// null: create a new one. Callers key the form per opening, so every open starts from the category (or a fresh
// draft) instead of the last attempt's leftovers.
export function useCategoryDraft(category: UserCategory | null, onSaved: () => void) {
  const { list } = useCategories()
  const actions = useCategoryActions()
  const [name, setName] = useState(category?.name ?? '')
  // The picker reports every drag step; the colour is only saved with the form.
  const [color, setColor] = useState(() => category?.color ?? firstFreeColor(list))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // State lags a fast double submit; the ref doesn't.
  const inFlight = useRef(false)
  const trimmed = name.trim()

  const submit = async (e: FormEvent) => {
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
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Speichern fehlgeschlagen'))
      setPending(false)
      inFlight.current = false
    }
  }

  return { category, list, name, setName, color, setColor, pending, error, canSave: trimmed !== '', submit }
}

export type CategoryDraft = ReturnType<typeof useCategoryDraft>

export function CategoryFormFields({
  draft,
  inputRef,
}: {
  draft: CategoryDraft
  inputRef: RefObject<HTMLInputElement>
}) {
  const id = useId()
  const inputId = `${id}-name`
  const symbolHintId = `${id}-symbol-hint`
  const { category, list, name, setName, color, setColor, error } = draft

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2.5">
          {/* Not a button yet: choosing a symbol waits for the backend (B11), so the field shows the initial. */}
          <CategoryMark category={{ name, color, colorLight: null, colorDark: null }} size="field" />
          <Label htmlFor={inputId} className="sr-only">
            Name
          </Label>
          <Input
            ref={inputRef}
            id={inputId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            required
            autoComplete="off"
            aria-describedby={symbolHintId}
            className="h-[38px] flex-1"
          />
        </div>
        <p id={symbolHintId} className="text-xs text-muted-foreground">
          Symbol kommt aus den Tag-Symbolen. Ohne Symbol zeigt Foodly den Anfangsbuchstaben.
        </p>
      </div>
      <CategoryColorPicker value={color} onChange={setColor} name={name} categories={list} exceptId={category?.id} />
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
