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
import { categoryPageHref } from '../shell/nav'
import { ResponsivePanel } from '../ResponsivePanel'
import { TriggerButton } from '../TriggerButton'
import { FOCUS_RING } from '../focusRing'
import { CategoryMark } from './CategoryMark'
import { CategoryAssignPanel } from './CategoryAssignPanel'
import type { Recipe, RecipeId, UserCategory, UserCategoryId } from '../../api/protocol'

export type CategoryAssign = {
  pending: ReadonlySet<UserCategoryId>
  creating: boolean
  // `live` is false for an error that arrived while the panel was closed: shown on reopen, but not announced as new.
  error: { text: string; live: boolean } | null
  open: boolean
  onOpenChange: (open: boolean) => void
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
// Known gap: switching to another recipe while a save runs resets the busy rows, so ticking the same category there
// before the answer arrives sends a list without the first recipe (last write wins, like two tabs; accepted).
function useCategoryAssign(recipeId: RecipeId, list: UserCategory[]): CategoryAssign {
  const { create, setRecipes } = useCategoryActions()
  const [pending, setPending] = useState<ReadonlySet<UserCategoryId>>(new Set())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<CategoryAssign['error']>(null)
  const [newName, setNewName] = useState('')
  const [open, setOpen] = useState(false)
  const pendingRef = useRef(new Set<UserCategoryId>())
  const creatingRef = useRef(false)
  const openRef = useRef(false)

  // Closing dismisses a shown error. One that arrives after closing waits for the reopen, without an alert role.
  // Controlled so the panel stays open when the viewport crosses the breakpoint (its content remounts; the state
  // lives here, so nothing is lost).
  const onOpenChange = (next: boolean) => {
    openRef.current = next
    setOpen(next)
    if (!next) setError(null)
  }
  const fail = (e: unknown, fallback: string) => {
    setError({ text: errorMessage(e, fallback), live: openRef.current })
  }

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
      .catch((e: unknown) => fail(e, 'Speichern fehlgeschlagen'))
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
        fail(e, 'Anlegen fehlgeschlagen')
        return false
      }
      setNewName('')
      try {
        await setRecipes(created.id, [recipeId])
      } catch (e) {
        fail(e, 'Zuordnen fehlgeschlagen')
      }
      return true
    } finally {
      creatingRef.current = false
      setCreating(false)
    }
  }

  return { pending, creating, error, open, onOpenChange, newName, setNewName, createAndAssign, toggle }
}

export function RecipeCategoryChips({ recipe }: { recipe: Recipe }) {
  const categories = useCategories()
  const assign = useCategoryAssign(recipe.id, categories.list)
  const cats = categories.status === 'ready' ? recipeCategories(recipe, categories.list) : []
  const showText = categories.status === 'ready' && cats.length === 0

  // Always rendered, also while loading, so the title doesn't jump down once the categories arrive.
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {cats.map((c) => (
        <Link
          key={c.id}
          to={categoryPageHref(c.id)}
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
        open={assign.open}
        onOpenChange={assign.onOpenChange}
        trigger={
          <TriggerButton
            variant="outline"
            size="xs2"
            // With its text showing, the text is the name (label in name, WCAG 2.5.3).
            aria-label={showText ? undefined : 'Kategorien ändern'}
            // min-h-6 lines it up with the chips; phones get the 40 px tap target.
            className="min-h-6 gap-1 border-dashed phone:min-h-10"
          >
            <Plus aria-hidden className="size-4" />
            {showText && 'Zu Kategorie hinzufügen'}
          </TriggerButton>
        }
        popover={{ align: 'start', className: 'w-72', 'aria-label': 'Kategorien' }}
        sheet={{ title: 'Kategorien', description: 'Dem Rezept Kategorien zuordnen' }}
      >
        {(variant) => (
          <CategoryAssignPanel recipeId={recipe.id} categories={categories} assign={assign} variant={variant} />
        )}
      </ResponsivePanel>
    </div>
  )
}
