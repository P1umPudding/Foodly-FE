// The category row above a recipe's title: one tinted chip per category it sits in, then "+" to add or remove it.
// Categories are personal, so this shows for every visible recipe, including foreign ones.
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '@postxl/ui-components'
import { useCategories } from '../../catalog/CatalogProvider'
import { useCategoryActions } from '../../catalog/useCategoryActions'
import { categoryColorVars, firstFreeColor } from '../../lib/categoryColor'
import { errorMessage } from '../../lib/errorMessage'
import { recipeCategories } from '../../list/rowData'
import { useNavState } from '../shell/useNavState'
import { ResponsivePanel } from '../ResponsivePanel'
import { TriggerButton } from '../TriggerButton'
import { FOCUS_RING } from '../focusRing'
import { CategoryMark } from './CategoryMark'
import { CategoryAssignPanel } from './CategoryAssignPanel'
import type { Recipe, RecipeId, UserCategory, UserCategoryId } from '../../api/protocol'

export type CategoryAssign = {
  pending: ReadonlySet<UserCategoryId>
  creating: boolean
  error: string | null
  clearError: () => void
  // The "Neue Kategorie" field; it clears once the category exists, even if assigning it failed afterwards.
  newName: string
  setNewName: (name: string) => void
  // Resolves true once the category exists.
  createAndAssign: () => Promise<boolean>
  toggle: (category: UserCategory) => void
}

// Kept here, not in the panel: the panel's content unmounts on close, and a save still in flight must keep its row
// busy (and a failed create its name) when the panel is opened again. The guards read refs, so a second click
// before the re-render is ignored too.
function useCategoryAssign(recipeId: RecipeId, list: UserCategory[]): CategoryAssign {
  const { create, setRecipes } = useCategoryActions()
  const [pending, setPending] = useState<ReadonlySet<UserCategoryId>>(new Set())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const pendingRef = useRef(new Set<UserCategoryId>())
  const creatingRef = useRef(false)

  const setPendingFor = (id: UserCategoryId, on: boolean) => {
    if (on) pendingRef.current.add(id)
    else pendingRef.current.delete(id)
    setPending(new Set(pendingRef.current))
  }

  const toggle = (category: UserCategory) => {
    if (pendingRef.current.has(category.id) || creatingRef.current) return
    // Not optimistic: the box shows the catalog, which only changes once the server answered.
    const next = category.recipes.includes(recipeId)
      ? category.recipes.filter((id) => id !== recipeId)
      : [...category.recipes, recipeId]
    setPendingFor(category.id, true)
    setError(null)
    setRecipes(category.id, next)
      .catch((e: unknown) => setError(errorMessage(e, 'Speichern fehlgeschlagen')))
      .finally(() => setPendingFor(category.id, false))
  }

  const createAndAssign = async (): Promise<boolean> => {
    const name = newName.trim()
    if (creatingRef.current || name === '') return false
    creatingRef.current = true
    setCreating(true)
    setError(null)
    try {
      let created: UserCategory
      try {
        created = await create({ name, color: firstFreeColor(list), colorLight: null, colorDark: null })
      } catch (e) {
        setError(errorMessage(e, 'Anlegen fehlgeschlagen'))
        return false
      }
      setNewName('')
      try {
        await setRecipes(created.id, [recipeId])
      } catch (e) {
        setError(errorMessage(e, 'Zuordnen fehlgeschlagen'))
      }
      return true
    } finally {
      creatingRef.current = false
      setCreating(false)
    }
  }

  return { pending, creating, error, clearError: () => setError(null), newName, setNewName, createAndAssign, toggle }
}

export function RecipeCategoryChips({ recipe }: { recipe: Recipe }) {
  const categories = useCategories()
  const { categoryHref } = useNavState()
  const assign = useCategoryAssign(recipe.id, categories.list)
  const cats = categories.status === 'ready' ? recipeCategories(recipe, categories.list) : []
  const showText = categories.status === 'ready' && cats.length === 0
  const [open, setOpen] = useState(false)
  // An error is about the last action in the panel; closing it dismisses the message (a reopened panel would
  // otherwise announce an old alert as new).
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) assign.clearError()
  }

  // Always rendered, also while loading, so the title doesn't jump down once the categories arrive.
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {cats.map((c) => (
        <Link
          key={c.id}
          to={categoryHref(c.id)}
          {...categoryColorVars(c)}
          className={cn(
            FOCUS_RING,
            'inline-flex items-center gap-1.5 rounded-sm bg-cat-soft py-0.5 pr-2 pl-0.5 text-xs font-medium text-cat-ink focus-visible:ring-ring/50 phone:min-h-10 phone:pl-1.5',
          )}
        >
          <CategoryMark category={c} size="sm" />
          {c.name}
        </Link>
      ))}
      <ResponsivePanel
        open={open}
        onOpenChange={onOpenChange}
        trigger={
          <TriggerButton
            variant="outline"
            size="sm"
            // With its text showing, the text is the name (label in name, WCAG 2.5.3).
            aria-label={showText ? undefined : 'Kategorien ändern'}
            // h-6 matches the chips (postxl sm is 32 px); phones get the 40 px tap target.
            className="h-6 gap-1 border-dashed px-2 phone:h-10"
          >
            <Plus aria-hidden className="size-4" />
            {showText && 'Zu Kategorie hinzufügen'}
          </TriggerButton>
        }
        popover={{ align: 'start', className: 'w-72', 'aria-label': 'Kategorien' }}
        sheet={{ title: 'Kategorien', description: 'Rezept Kategorien zuordnen' }}
      >
        {(variant) => (
          <CategoryAssignPanel recipeId={recipe.id} categories={categories} assign={assign} variant={variant} />
        )}
      </ResponsivePanel>
    </div>
  )
}
