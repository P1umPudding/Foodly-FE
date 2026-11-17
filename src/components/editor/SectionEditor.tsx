import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, Input } from '@postxl/ui-components'
import { ClipboardPaste, Plus } from 'lucide-react'
import { TriggerButton } from '../TriggerButton'
import { COL_HEAD } from './EditorSidebar'
import { INGREDIENT_COLUMNS, IngredientRow } from './IngredientRow'
import { IngredientLineButton } from './IngredientLineButton'
import { IngredientSheet } from './IngredientSheet'
import { PasteIngredientsDialog } from './PasteIngredientsDialog'
import { RowMenu } from './RowMenu'
import { StepRow } from './StepRow'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { appendIngredients, isBlank, move, newIngredient, newStep } from '../../editor/draft'
import type { DraftIngredient, DraftSection } from '../../editor/draft'

// One card per section (mockup `.ed-sec`): the name as the card's heading with ⋯ beside it, ingredients as a table,
// numbered steps. The "+" buttons are muted like the mockup's `.btn.add` (audit E9).
const ADD_BUTTON = 'gap-1.5 self-start text-muted-foreground touch:h-10'

export function SectionEditor({
  section,
  index,
  total,
  showTimerHint = false,
  onChange,
  onUp,
  onDown,
  onRemove,
  onRemovedFocus,
}: {
  section: DraftSection
  index: number
  total: number
  showTimerHint?: boolean
  onChange: (next: DraftSection) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  onRemovedFocus?: () => void
}) {
  const addIngredient = useRef<HTMLButtonElement>(null)
  const addStep = useRef<HTMLButtonElement>(null)
  const pasteButton = useRef<HTMLButtonElement>(null)
  // Keyed per opening (see PasteIngredientsDialog); null until first opened.
  const [paste, setPaste] = useState<{ key: number; open: boolean } | null>(null)
  const patchIngredient = (key: number, patch: Partial<DraftIngredient>) =>
    onChange({
      ...section,
      ingredients: section.ingredients.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    })
  const moveIngredient = (key: number, delta: -1 | 1) =>
    onChange({ ...section, ingredients: move(section.ingredients, key, delta) })
  const removeIngredient = (key: number) =>
    onChange({ ...section, ingredients: section.ingredients.filter((r) => r.key !== key) })

  // Phone (#217): reading rows, one ingredient at a time in IngredientSheet.
  const isDesktop = useIsDesktop()
  const [editing, setEditing] = useState<{ key: number; isNew: boolean } | null>(null)
  const editedIndex = editing ? section.ingredients.findIndex((line) => line.key === editing.key) : -1
  const edited = editedIndex === -1 ? null : section.ingredients[editedIndex]
  // Keeps the sheet's content while it animates out after „Entfernen“.
  const [shown, setShown] = useState<DraftIngredient | null>(null)
  if (edited && edited !== shown) setShown(edited)
  // Crossing to the desktop drops the sheet, and it must not come back when crossing back. A row gone from outside (a
  // reload swaps the keys) leaves nothing to edit.
  if (editing !== null && (isDesktop || edited === null)) setEditing(null)
  const rowButtons = useRef(new Map<number, HTMLButtonElement>())
  const lastEdited = useRef<number | null>(null)
  const closed = useRef<number | null>(null)
  const openSheet = (key: number, isNew = false) => {
    closed.current = null
    lastEdited.current = key
    setEditing({ key, isNew })
  }
  // A row left blank goes when its sheet closes. Not in the close handler itself: the blur that commits the picker has
  // just called onChange, and RecipeEditor builds each change from its render-time draft, so a second call in the same
  // event would undo the first. Not on close-autofocus either: that also fires when the breakpoint unmounts the sheet.
  useEffect(() => {
    if (editing !== null || closed.current === null) return
    const key = closed.current
    closed.current = null
    const line = section.ingredients.find((l) => l.key === key)
    if (line && isBlank(line)) onChange({ ...section, ingredients: section.ingredients.filter((l) => l.key !== key) })
  }, [editing, section, onChange])

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4 phone:p-3.5">
        <div className="mb-2 flex items-center gap-2">
          {/* The name is the card's heading (mockup `.ed-sec-name`): a borderless field until hovered or focused. text-lg is
              the app's heading token (as SectionHeader); no Input size prop gives a heading. */}
          <Input
            variant="discreet"
            aria-label="Abschnittsname"
            placeholder="Abschnitt ohne Namen"
            className="flex-1 px-1 text-lg font-semibold dark:bg-transparent"
            value={section.name}
            onChange={(e) => onChange({ ...section, name: e.target.value })}
          />
          <RowMenu
            label={`Abschnitt ${index + 1}: Aktionen`}
            icon="horizontal"
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            onUp={onUp}
            onDown={onDown}
            onRemove={onRemove}
            onRemovedFocus={onRemovedFocus}
          />
        </div>

        {isDesktop && section.ingredients.length > 0 && (
          <div className={`${INGREDIENT_COLUMNS} text-xs font-medium text-subtle-foreground`}>
            <span>Menge</span>
            <span>Einheit</span>
            <span>Zutat</span>
            <span>Zusatz</span>
          </div>
        )}
        {isDesktop &&
          section.ingredients.map((line, i) => (
            <IngredientRow
              key={line.key}
              line={line}
              index={i}
              onChange={(patch) => patchIngredient(line.key, patch)}
              onUp={() => moveIngredient(line.key, -1)}
              onDown={() => moveIngredient(line.key, 1)}
              onRemove={() => removeIngredient(line.key)}
              onRemovedFocus={() => addIngredient.current?.focus()}
              canMoveUp={i > 0}
              canMoveDown={i < section.ingredients.length - 1}
            />
          ))}
        {!isDesktop && section.ingredients.length > 0 && (
          <div className="mb-1 border-t">
            {section.ingredients.map((line) => (
              <IngredientLineButton
                key={line.key}
                ref={(el) => {
                  if (el) rowButtons.current.set(line.key, el)
                  else rowButtons.current.delete(line.key)
                }}
                line={line}
                onOpen={() => openSheet(line.key)}
              />
            ))}
          </div>
        )}
        {!isDesktop && shown && (
          <IngredientSheet
            line={edited ?? shown}
            open={edited !== null}
            focusAmount={editing?.isNew ?? false}
            canMoveUp={editedIndex > 0}
            canMoveDown={editedIndex !== -1 && editedIndex < section.ingredients.length - 1}
            onChange={(patch) => patchIngredient(shown.key, patch)}
            onUp={() => moveIngredient(shown.key, -1)}
            onDown={() => moveIngredient(shown.key, 1)}
            onRemove={() => {
              setEditing(null)
              removeIngredient(shown.key)
            }}
            onClose={() => {
              closed.current = shown.key
              setEditing(null)
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              const row = lastEdited.current === null ? undefined : rowButtons.current.get(lastEdited.current)
              ;(row ?? addIngredient.current)?.focus()
            }}
          />
        )}
        {/* mockup `.ed-adds` */}
        <div className="flex gap-1 self-start">
          <TriggerButton
            ref={addIngredient}
            variant="ghost"
            size="sm"
            aria-label="Zutat hinzufügen"
            className={ADD_BUTTON}
            onClick={() => {
              const row = newIngredient()
              onChange({ ...section, ingredients: [...section.ingredients, row] })
              if (!isDesktop) openSheet(row.key, true)
            }}
          >
            <Plus className="size-4" />
            Zutat
          </TriggerButton>
          <TriggerButton
            ref={pasteButton}
            variant="ghost"
            size="sm"
            className={ADD_BUTTON}
            onClick={() => setPaste((p) => ({ key: (p?.key ?? 0) + 1, open: true }))}
          >
            <ClipboardPaste className="size-4" />
            Mehrere einfügen
          </TriggerButton>
        </div>
        {paste && (
          <PasteIngredientsDialog
            key={paste.key}
            open={paste.open}
            onClose={() => setPaste((p) => (p ? { ...p, open: false } : p))}
            onInsert={(rows) => onChange({ ...section, ingredients: appendIngredients(section.ingredients, rows) })}
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              pasteButton.current?.focus()
            }}
          />
        )}

        <h3 className={`${COL_HEAD} mt-[18px]`}>Zubereitung</h3>
        {section.steps.map((step, i) => (
          <StepRow
            key={step.key}
            index={i}
            text={step.text}
            onChange={(text) =>
              onChange({ ...section, steps: section.steps.map((s) => (s.key === step.key ? { ...s, text } : s)) })
            }
            onUp={() => onChange({ ...section, steps: move(section.steps, step.key, -1) })}
            onDown={() => onChange({ ...section, steps: move(section.steps, step.key, 1) })}
            onRemove={() => onChange({ ...section, steps: section.steps.filter((s) => s.key !== step.key) })}
            onRemovedFocus={() => addStep.current?.focus()}
            canMoveUp={i > 0}
            canMoveDown={i < section.steps.length - 1}
          />
        ))}
        <TriggerButton
          ref={addStep}
          variant="ghost"
          size="sm"
          aria-label="Schritt hinzufügen"
          className={ADD_BUTTON}
          onClick={() => onChange({ ...section, steps: [...section.steps, newStep()] })}
        >
          <Plus className="size-4" />
          Schritt
        </TriggerButton>
        {showTimerHint && (
          <p className="mt-1 text-xs text-muted-foreground">
            Zeitangaben wie „30 Minuten“ werden im Rezept zu Timern, die man antippen kann.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
