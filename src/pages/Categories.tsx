// „Meine Kategorien“: the user's categories, created, renamed, recoloured and deleted here.
import { useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@postxl/ui-components'
import { EllipsisVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCategories } from '../catalog/CatalogProvider'
import { CategoryEditDialog } from '../components/category/CategoryEditDialog'
import { CategoryMark } from '../components/category/CategoryMark'
import { DeleteCategoryDialog } from '../components/category/DeleteCategoryDialog'
import { RetryAlert } from '../components/RetryAlert'
import { TriggerButton } from '../components/TriggerButton'
import { FOCUS_RING } from '../components/focusRing'
import { useNavState } from '../components/shell/useNavState'
import { useHasAppHistory } from '../hooks/useHasAppHistory'
import type { UserCategory, UserCategoryId } from '../api/protocol'

// `target` outlives `open`, so a closing dialog keeps its title and name during the exit animation. `key` is new per
// opening: the dialog starts from scratch every time, even when reopened mid-animation.
type DialogState = { kind: 'edit' | 'delete'; target: UserCategory | null; open: boolean; key: number }

const recipeCount = (n: number) => `${n} ${n === 1 ? 'Rezept' : 'Rezepte'}`

export function Categories() {
  const navigate = useNavigate()
  const hasAppHistory = useHasAppHistory()
  const categories = useCategories()
  const { categoryHref } = useNavState()
  const ordered = [...categories.list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const openings = useRef(0)
  // Header and empty state never show at once: one ref for whichever „Neue Kategorie“ is rendered.
  const newButton = useRef<HTMLButtonElement>(null)
  const menuTriggers = useRef(new Map<UserCategoryId, HTMLButtonElement>())

  const openDialog = (kind: DialogState['kind'], target: UserCategory | null) =>
    setDialog({ kind, target, open: true, key: ++openings.current })
  const closeDialog = () => setDialog((d) => (d ? { ...d, open: false } : d))

  // The ⋮ item that opened the dialog is gone by now; back to its row's ⋮, or, when there is no such row (created,
  // deleted), to „Neue Kategorie“.
  const restoreFocus = (e: Event) => {
    e.preventDefault()
    const trigger = dialog?.target ? menuTriggers.current.get(dialog.target.id) : undefined
    ;(trigger ?? newButton.current)?.focus()
  }

  // Came from inside the app: go back like the browser does. Otherwise (direct link) the plain link to /recipes.
  const onBack = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (!hasAppHistory()) return
    e.preventDefault()
    navigate(-1)
  }

  const newCategoryButton = (
    <TriggerButton ref={newButton} onClick={() => openDialog('edit', null)} className="gap-1.5">
      <Plus aria-hidden className="size-4" />
      Neue Kategorie
    </TriggerButton>
  )

  const ready = categories.status === 'ready'

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 phone:px-4 phone:py-6">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/recipes" onClick={onBack}>
            ← Zurück
          </Link>
        </Button>
      </div>
      <h1 className="sr-only">Kategorien</h1>

      <section aria-labelledby="my-categories" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="my-categories" className="text-lg font-semibold">
            Meine Kategorien
          </h2>
          {ready && ordered.length > 0 && newCategoryButton}
        </div>
        <p className="text-sm text-muted-foreground">
          Kategorien sind deine persönlichen Sammlungen. Ein Rezept kann in mehreren sein, andere sehen sie nicht.
        </p>

        {categories.status === 'loading' && (
          <Card className="gap-0 p-0">
            {[0, 1, 2].map((i) => (
              <div key={i} data-testid="category-row-skeleton" className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                <Skeleton className="size-7 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </Card>
        )}

        {categories.status === 'error' && (
          <RetryAlert
            title="Konnte Kategorien nicht laden"
            message={categories.error?.message}
            onRetry={categories.retry}
          />
        )}

        {ready && ordered.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">Noch keine Kategorien. Leg eine an und sammle darin Rezepte.</p>
            {newCategoryButton}
          </div>
        )}

        {ready && ordered.length > 0 && (
          <Card className="gap-0 p-0">
            <ul aria-label="Meine Kategorien">
              {ordered.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                  <CategoryMark category={c} size="md" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    {/* Until the category page exists (K6), the name opens the list filtered to it. */}
                    <Link
                      to={categoryHref(c.id)}
                      className={cn('truncate rounded-sm font-medium hover:underline', FOCUS_RING)}
                    >
                      {c.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">{recipeCount(c.recipes.length)}</span>
                  </div>
                  {/* Not modal: a modal menu opening a modal dialog can leave pointer-events: none on the body. */}
                  <DropdownMenu modal={false}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <TriggerButton
                            ref={(el) => {
                              if (el) menuTriggers.current.set(c.id, el)
                              else menuTriggers.current.delete(c.id)
                            }}
                            variant="ghost"
                            size="icon"
                            aria-label={`Aktionen für „${c.name}“`}
                          >
                            <EllipsisVertical aria-hidden className="size-4" />
                          </TriggerButton>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Aktionen</TooltipContent>
                    </Tooltip>
                    {/* The dialog decides where focus goes once it closes. */}
                    <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                      <DropdownMenuItem className="gap-2" onSelect={() => openDialog('edit', c)}>
                        <Pencil aria-hidden className="size-4" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" className="gap-2" onSelect={() => openDialog('delete', c)}>
                        <Trash2 aria-hidden className="size-4" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {dialog?.kind === 'edit' && (
        <CategoryEditDialog
          key={dialog.key}
          open={dialog.open}
          onClose={closeDialog}
          category={dialog.target}
          onCloseAutoFocus={restoreFocus}
        />
      )}
      {dialog?.kind === 'delete' && dialog.target && (
        <DeleteCategoryDialog
          key={dialog.key}
          open={dialog.open}
          onClose={closeDialog}
          category={dialog.target}
          onCloseAutoFocus={restoreFocus}
        />
      )}
    </div>
  )
}
