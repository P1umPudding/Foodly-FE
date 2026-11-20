// The cook mode's ingredients (#210): the size stepper above all sections, every row tickable. The same content
// sits in the column from 1024 px and in the sheet below.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { Sheet, SheetTrigger } from '@postxl/ui-components'
import { BottomSheet } from '../BottomSheet'
import { TagText } from '../TagText'
import { TriggerButton } from '../TriggerButton'
import { IngredientTable } from '../recipe/IngredientTable'
import { PortionScaler } from '../recipe/PortionScaler'
import type { Recipe, RecipeIngredientId } from '../../api/protocol'

export type CookIngredientsProps = {
  recipe: Recipe
  factor: number
  onFactorChange: (factor: number) => void
  checkedIds: ReadonlySet<RecipeIngredientId>
  onToggle: (id: RecipeIngredientId) => void
}

export function hasIngredients(recipe: Recipe): boolean {
  return recipe.sections.some((s) => s.ingredients.length > 0)
}

function CookIngredients({
  recipe,
  factor,
  onFactorChange,
  checkedIds,
  onToggle,
  headingLevel,
  stickyClassName,
}: CookIngredientsProps & { headingLevel: 2 | 3; stickyClassName?: string }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const multiple = recipe.sections.length > 1
  return (
    <>
      <div className={stickyClassName}>
        <PortionScaler
          factor={factor}
          onChange={onFactorChange}
          sizeNumber={recipe.sizeNumber}
          sizeText={recipe.sizeText}
        />
      </div>
      {recipe.sections.map(
        (section) =>
          section.ingredients.length > 0 && (
            <div key={section.id} className="mt-6">
              {/* In the sheet, whose title already says „Zutaten“, a lone section needs no group title. */}
              {(headingLevel === 2 || multiple) && (
                <Heading className="mb-2 text-xs font-semibold text-muted-foreground">
                  {multiple && section.name ? (
                    <>
                      Zutaten · <TagText value={section.name} />
                    </>
                  ) : (
                    'Zutaten'
                  )}
                </Heading>
              )}
              <IngredientTable
                ingredients={section.ingredients}
                factor={factor}
                checkable
                checkedIds={checkedIds}
                onToggle={onToggle}
                quantityClassName="w-20"
              />
            </div>
          ),
      )}
    </>
  )
}

// From 1024 px: a column left of the step, scrolling on its own; the stepper stays at its top.
// `takeFocus`: the sheet just closed because the window grew, and its trigger is gone; focus would fall to the page.
export function CookIngredientsColumn({
  takeFocus = false,
  onFocusTaken,
  ...props
}: CookIngredientsProps & { takeFocus?: boolean; onFocusTaken?: () => void }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!takeFocus) return
    // The first checkbox: on it the arrow keys still page (the stepper's box would swallow them, and a stray Space
    // on „Weniger“ would shrink the recipe).
    ref.current?.querySelector<HTMLElement>('input[type=checkbox]')?.focus()
    onFocusTaken?.()
  }, [takeFocus, onFocusTaken])
  return (
    <aside
      ref={ref}
      aria-label="Zutaten"
      className="w-[280px] shrink-0 overflow-y-auto border-r border-divider px-5 pb-7 text-lg xl:w-[320px] xl:px-6"
    >
      <CookIngredients {...props} headingLevel={2} stickyClassName="sticky top-0 z-10 bg-background pt-7 pb-1" />
    </aside>
  )
}

// Below 1024 px: „Zutaten“ in the header opens the same content in a bottom sheet. Cook mode keeps `open`, so its
// arrow keys rest while the sheet is up.
export function CookIngredientsSheet({
  open,
  onOpenChange,
  ...props
}: CookIngredientsProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <TriggerButton variant="outline" size="sm" className="gap-1.5 touch:h-10">
          <ListChecks className="size-4" aria-hidden />
          Zutaten
        </TriggerButton>
      </SheetTrigger>
      <BottomSheet title="Zutaten" description="Größe und Zutaten des Rezepts, zum Abhaken" className="text-lg">
        <CookIngredients {...props} headingLevel={3} />
      </BottomSheet>
    </Sheet>
  )
}

// Keeps the sheet's open state; also closes it when the window grows past the sheet (the column takes over).
export function useIngredientSheet(wide: boolean) {
  const [open, setOpen] = useState(false)
  const [handOver, setHandOver] = useState(false)
  if (wide && open) {
    setOpen(false)
    setHandOver(true)
  } else if (!wide && handOver) setHandOver(false)
  const handedOver = useCallback(() => setHandOver(false), [])
  return { open, setOpen, handOver, handedOver }
}
