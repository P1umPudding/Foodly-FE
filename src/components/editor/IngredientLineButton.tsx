import { forwardRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { TagText } from '../TagText'
import { TriggerButton } from '../TriggerButton'
import { useIngredients } from '../../catalog/CatalogProvider'
import { draftLineParts, isBlank, type DraftIngredient } from '../../editor/draft'

// One ingredient on the phone as a reading row (mockup `.ed-ing-m`, audit editor F1): quantity muted and right-aligned in
// a 72 px column, name, Zusatz muted, chevron. The whole row opens IngredientSheet. The spaces between the cells keep the
// accessible name readable ("ca. 800 g Tomaten gehackt").
export const IngredientLineButton = forwardRef<HTMLButtonElement, { line: DraftIngredient; onOpen: () => void }>(
  function IngredientLineButton({ line, onOpen }, ref) {
    const { byId } = useIngredients()
    const { quantity, name, extra } = draftLineParts(line, byId)
    const blank = isBlank(line)

    return (
      <TriggerButton
        ref={ref}
        variant="bare"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="grid min-h-[46px] w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2.5 border-b py-2 text-left hover:bg-accent/50"
      >
        <span className="text-right text-muted-foreground tabular-nums">
          <TagText value={quantity} />
        </span>{' '}
        {blank ? (
          <span className="text-muted-foreground">Neue Zutat</span>
        ) : (
          <span className="min-w-0">
            <TagText value={name} />
            {extra !== '' && (
              <>
                {' '}
                <span className="text-muted-foreground">
                  <TagText value={extra} />
                </span>
              </>
            )}
          </span>
        )}
        <ChevronRight aria-hidden className="size-4 text-subtle-foreground" />
      </TriggerButton>
    )
  },
)
