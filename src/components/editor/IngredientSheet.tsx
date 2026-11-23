// Editing one ingredient on the phone (#217, mockup sheet „Zutat bearbeiten“, audit editor F3–F9). Every change goes
// straight into the draft, as in the desktop row; „Fertig“ only closes. Removing a row left blank is the caller's job.
import { useId, useRef } from 'react'
import { Button, Input, Label, Sheet, SheetClose } from '@postxl/ui-components'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { BottomSheet } from '../BottomSheet'
import { IngredientPicker } from './IngredientPicker'
import { UnitInput, pickHandlers } from './IngredientRow'
import type { DraftIngredient } from '../../editor/draft'

// The mockup's quick picks, a subset of UNITS; the field still offers all of them.
const UNIT_CHIPS = ['g', 'kg', 'ml', 'EL', 'TL', 'Prise', 'Stück']
const HINT = 'mt-1 text-xs text-muted-foreground'

export function IngredientSheet({
  line,
  open,
  focusAmount,
  canMoveUp,
  canMoveDown,
  onChange,
  onUp,
  onDown,
  onRemove,
  onClose,
  onCloseAutoFocus,
}: {
  line: DraftIngredient
  open: boolean
  // A new row: start in Menge. An existing one keeps Radix' default (✕), so a tap doesn't pop up the keyboard.
  focusAmount: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (patch: Partial<DraftIngredient>) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  onClose: () => void
  onCloseAutoFocus: (e: Event) => void
}) {
  const id = useId()
  const escaping = useRef(false)
  const amount = useRef<HTMLInputElement>(null)
  const isCatalog = line.ingredient !== null

  const onOpenChange = (next: boolean) => {
    if (next) return
    // Radix dismisses on pointerdown, before the field's blur: blur it now so IngredientPicker commits what was typed.
    // Escape skips that, so typed text is dropped as it is on the desktop (the other fields commit per keystroke).
    if (!escaping.current) (document.activeElement as HTMLElement | null)?.blur()
    escaping.current = false
    onClose()
  }

  const onEscapeKeyDown = (e: KeyboardEvent) => {
    // The first Escape in an open suggestion list only closes the list (see SuggestInput).
    const target = e.target as Element | null
    if (target?.matches('[role=combobox][aria-expanded=true]')) e.preventDefault()
    else escaping.current = true
  }

  const onOpenAutoFocus = (e: Event) => {
    if (!focusAmount) return
    e.preventDefault()
    amount.current?.focus()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <BottomSheet
        title="Zutat bearbeiten"
        description="Menge, Einheit, Zutat und Zusatz dieser Zeile"
        scroll={false}
        onEscapeKeyDown={onEscapeKeyDown}
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* pb-8: room for the suggestion lists below the last fields, which open inside this scroll region and scroll it
            into view (keepListInView) */}
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-1.5 pb-8">
          <div>
            <Label htmlFor={`${id}-amount`}>Menge</Label>
            <Input
              ref={amount}
              id={`${id}-amount`}
              className="mt-1.5 h-10 tabular-nums"
              placeholder="z. B. ca. 800"
              aria-describedby={`${id}-amount-hint`}
              value={line.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
            />
            <p id={`${id}-amount-hint`} className={HINT}>
              Auch „ca. 800“, „1–2“ oder „½“.
            </p>
          </div>
          <div>
            <Label htmlFor={`${id}-unit`}>Einheit</Label>
            <UnitInput
              className="mt-1.5"
              field={{ id: `${id}-unit`, className: 'h-10' }}
              keepListInView
              value={line.unit}
              onChange={(unit) => onChange({ unit })}
            />
            <div role="group" aria-label="Schnellwahl Einheit" className="mt-1.5 flex flex-wrap gap-1.5">
              {UNIT_CHIPS.map((unit) => {
                const on = line.unit.trim().toLowerCase() === unit.toLowerCase()
                return (
                  <Button
                    key={unit}
                    type="button"
                    size="sm"
                    variant={on ? 'default' : 'outline'}
                    aria-pressed={on}
                    className="h-10 min-w-10 rounded-full"
                    onClick={() => onChange({ unit: on ? '' : unit })}
                  >
                    {unit}
                  </Button>
                )
              })}
            </div>
          </div>
          <div>
            <Label htmlFor={`${id}-name`}>Zutat</Label>
            <IngredientPicker
              className="mt-1.5"
              field={{ id: `${id}-name`, describedBy: `${id}-name-hint`, className: 'h-10' }}
              keepListInView
              value={line.ingredient}
              text={line.text}
              {...pickHandlers(line, onChange)}
            />
            <p id={`${id}-name-hint`} className={HINT}>
              Aus dem Zutaten-Katalog, sonst Freitext.
            </p>
          </div>
          <div>
            <Label htmlFor={`${id}-extra`}>Zusatz</Label>
            {/* Free text keeps its whole name in `text` (nothing is split), so there is no Zusatz to edit. */}
            <Input
              id={`${id}-extra`}
              className="mt-1.5 h-10"
              placeholder="z. B. gehackt, nach Geschmack"
              disabled={!isCatalog}
              aria-describedby={isCatalog ? undefined : `${id}-extra-hint`}
              value={isCatalog ? line.text : ''}
              onChange={(e) => onChange({ text: e.target.value })}
            />
            {!isCatalog && (
              <p id={`${id}-extra-hint`} className={HINT}>
                Zusatz nur bei Zutaten aus dem Katalog
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-10" disabled={!canMoveUp} onClick={onUp}>
              <ArrowUp className="size-4" />
              Nach oben
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-10" disabled={!canMoveDown} onClick={onDown}>
              <ArrowDown className="size-4" />
              Nach unten
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
              Entfernen
            </Button>
          </div>
        </div>
        {/* mockup: a fixed footer with „Fertig“ across the full width. Button wraps SheetClose: no forwardRef. */}
        <div className="shrink-0 border-t px-4 pt-3 pb-4">
          <Button asChild className="h-10 w-full">
            <SheetClose>Fertig</SheetClose>
          </Button>
        </div>
      </BottomSheet>
    </Sheet>
  )
}
