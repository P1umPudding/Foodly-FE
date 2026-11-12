// Panel content behind the "+" chip of the recipe detail: tick the categories the recipe sits in, or create one.
// Every toggle saves at once; the state lives in RecipeCategoryChips (see there).
import { useRef, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, Input, Skeleton, cn } from '@postxl/ui-components'
import { RetryAlert } from '../RetryAlert'
import { FilterCheckRow } from '../list/filters/FilterCheckRow'
import { CategoryLabel } from '../list/filters/CategoryFilter'
import { categoryColorVars } from '../../lib/categoryColor'
import type { useCategories } from '../../catalog/CatalogProvider'
import type { PanelVariant } from '../ResponsivePanel'
import type { CategoryAssign } from './RecipeCategoryChips'
import type { RecipeId } from '../../api/protocol'

// The name limit of the categories spec (same as the category dialog, K3).
const MAX_NAME = 60

export function CategoryAssignPanel({
  recipeId,
  categories,
  assign,
  variant,
}: {
  recipeId: RecipeId
  categories: ReturnType<typeof useCategories>
  assign: CategoryAssign
  variant: PanelVariant
}) {
  const { list, status, error, retry } = categories

  if (status === 'loading') {
    return (
      <div className="space-y-2" aria-busy>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    )
  }
  if (status === 'error') {
    return <RetryAlert title="Kategorien nicht geladen" message={error?.message} onRetry={retry} />
  }

  return (
    <div className="space-y-3">
      {list.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">Noch keine Kategorien</p>
      ) : (
        // The sheet scrolls itself; only the popover needs a cap.
        <div className={cn('space-y-0.5', variant === 'popover' && 'max-h-72 overflow-y-auto')}>
          {list.map((c) => (
            <FilterCheckRow
              key={c.id}
              checked={c.recipes.includes(recipeId)}
              onToggle={() => assign.toggle(c)}
              busy={assign.pending.has(c.id) || assign.creating}
              {...categoryColorVars(c)}
            >
              <CategoryLabel name={c.name} />
            </FilterCheckRow>
          ))}
        </div>
      )}
      {assign.error && (
        <p role="alert" className="px-1 text-sm text-destructive">
          {assign.error}
        </p>
      )}
      <CreateCategoryForm assign={assign} />
    </div>
  )
}

function CreateCategoryForm({ assign }: { assign: CategoryAssign }) {
  const [name, setName] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const trimmed = name.trim()
  // aria-disabled and readOnly instead of disabled: a disabled control under the focus would drop it to <body>.
  const blocked = trimmed === '' || assign.creating

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (blocked) return
    if (await assign.createAndAssign(trimmed)) {
      setName('')
      input.current?.focus()
    }
  }

  return (
    <form className="flex items-center gap-2" aria-busy={assign.creating} onSubmit={(e) => void onSubmit(e)}>
      <Input
        ref={input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        readOnly={assign.creating}
        maxLength={MAX_NAME}
        placeholder="Neue Kategorie"
        aria-label="Neue Kategorie"
        className="min-w-0 flex-1"
      />
      <Button type="submit" size="sm" aria-disabled={blocked || undefined} className="gap-1.5">
        {assign.creating && <Loader2 aria-hidden className="size-4 animate-spin" />}
        Anlegen
      </Button>
    </form>
  )
}
