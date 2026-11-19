// „Meine Kategorien“: the user's categories, created, renamed, recoloured, reordered and deleted here.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert,
  AlertTitle,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@postxl/ui-components'
import { Skeleton } from '../components/Skeleton'
import { ArrowDown, ArrowUp, Folder, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCategories } from '../catalog/CatalogProvider'
import { useCategoryActions } from '../catalog/useCategoryActions'
import { CategoryEditorCard } from '../components/category/CategoryEditorCard'
import { CategoryMark } from '../components/category/CategoryMark'
import { DeleteCategoryDialog } from '../components/category/DeleteCategoryDialog'
import { EmptyState, ErrorState } from '../components/StateCard'
import { TriggerButton } from '../components/TriggerButton'
import { FOCUS_RING } from '../components/focusRing'
import { ROW_DIVIDER } from '../components/rowDivider'
import { Page } from '../components/shell/Page'
import { categoryPageHref } from '../components/shell/nav'
import { moveCategory } from '../lib/moveCategory'
import type { UserCategory, UserCategoryId } from '../api/protocol'

// `target` outlives `open`, so a closing dialog keeps its title and name during the exit animation. `key` is new per
// opening: the dialog (and the inline editor) starts from scratch every time, even when reopened mid-animation.
type DialogState = { target: UserCategory; open: boolean; key: number }
// The mockup edits inline: one card under the list, null target = a new category.
type EditorState = { target: UserCategory | null; key: number }

// Mockup `.pad-rows > .row` in a `.divided` card.
const ROW = cn('flex items-center gap-3.5 rounded-sm px-3 py-2.5', ROW_DIVIDER)

const recipeCount = (n: number) => `${n} ${n === 1 ? 'Rezept' : 'Rezepte'}`

export function Categories() {
  const categories = useCategories()
  const ordered = [...categories.list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  // While the editor saves, nothing may replace it: a failed save would report into a card that is gone.
  const [editorSaving, setEditorSaving] = useState(false)
  // The opening the page shows now. A card dropped mid-save (its category deleted in another tab) still finishes its
  // request and calls onClose; that must not close a newer card.
  const currentEditorKey = useRef<number | null>(null)
  // Set when the editor closes; run once it is gone, so focus lands on a trigger that exists by then.
  const focusAfterEditor = useRef<(() => void) | null>(null)
  const openings = useRef(0)
  // Header and empty state never show at once: one ref for whichever „Neue Kategorie“ is rendered.
  const newButton = useRef<HTMLButtonElement>(null)
  const menuTriggers = useRef(new Map<UserCategoryId, HTMLButtonElement>())
  const { reorder } = useCategoryActions()
  const [moveFailed, setMoveFailed] = useState(false)
  const moves = useRef(0)
  const lastMoved = useRef<UserCategoryId | null>(null)
  // Bearbeiten/Löschen: the editor or dialog places focus itself, so the menu must not put it back on the ⋯ first.
  const menuHandsOffFocus = useRef(false)

  const focusLastMoved = () => {
    const trigger = lastMoved.current === null ? undefined : menuTriggers.current.get(lastMoved.current)
    ;(trigger ?? newButton.current)?.focus()
  }

  // Each move sends the whole current list; only the latest one decides (the catalog rolls back only for that one).
  const move = (category: UserCategory, delta: -1 | 1) => {
    const current = ordered.map((c) => c.id)
    const ids = moveCategory(current, category.id, delta)
    // The list can change while the menu is open (e.g. another tab): a move that changes nothing sends nothing.
    if (ids.every((id, k) => id === current[k])) return
    const mine = ++moves.current
    lastMoved.current = category.id
    setMoveFailed(false)
    // A rollback moves the row back; React DOM re-focuses its ⋯ after the commit if the move blurred it.
    void reorder(ids).catch(() => {
      if (mine === moves.current) setMoveFailed(true)
    })
  }

  // Opening another one replaces an open editor and drops its draft.
  const openEditor = (target: UserCategory | null) => {
    currentEditorKey.current = ++openings.current
    setEditor({ target, key: currentEditorKey.current })
  }
  const openDelete = (target: UserCategory) => {
    menuHandsOffFocus.current = true
    setDialog({ target, open: true, key: ++openings.current })
  }
  const closeDialog = () => setDialog((d) => (d ? { ...d, open: false } : d))

  // Back to the row's ⋯, or, when there is no such row (created, deleted), to „Neue Kategorie“.
  const focusTrigger = (target: UserCategory | null) => {
    const trigger = target ? menuTriggers.current.get(target.id) : undefined
    ;(trigger ?? newButton.current)?.focus()
  }
  // The ⋯ item that opened the dialog is gone by now.
  const restoreFocus = (e: Event) => {
    e.preventDefault()
    focusTrigger(dialog?.target ?? null)
  }
  const closeEditor = (opening: EditorState) => {
    if (opening.key !== currentEditorKey.current) return
    currentEditorKey.current = null
    focusAfterEditor.current = () => focusTrigger(opening.target)
    // In the same render as the close, so „Neue Kategorie“ is enabled again before focus goes back to it.
    setEditorSaving(false)
    setEditor(null)
  }

  useEffect(() => {
    if (editor) return
    focusAfterEditor.current?.()
    focusAfterEditor.current = null
  }, [editor])

  // The category being edited was deleted (here or in another tab): its draft has nothing left to save to.
  const editedGone = editor?.target != null && !categories.list.some((c) => c.id === editor.target?.id)
  useEffect(() => {
    if (!editedGone) return
    currentEditorKey.current = null
    focusAfterEditor.current = () => focusTrigger(null)
    setEditorSaving(false)
    setEditor(null)
  }, [editedGone])

  const newCategoryButton = (
    <TriggerButton
      ref={newButton}
      variant="outline"
      size="sm"
      className="touch:h-10"
      disabled={editorSaving}
      onClick={() => openEditor(null)}
    >
      <Plus aria-hidden className="size-4" />
      Neue Kategorie
    </TriggerButton>
  )

  const ready = categories.status === 'ready'

  return (
    // Back and title sit in the shell header (/categories is a subpage); the content is the mockup's `.narrow`.
    <Page className="pb-10">
      <h1 className="sr-only">Kategorien</h1>

      <section aria-labelledby="my-categories" className="flex max-w-[640px] flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="my-categories" className="text-lg font-semibold tracking-[-0.01em]">
            Meine Kategorien
          </h2>
          {ready && ordered.length > 0 && newCategoryButton}
        </div>
        <p className="-mt-1 text-sm text-muted-foreground">
          Kategorien sind deine persönlichen Sammlungen. Ein Rezept kann in mehreren sein, andere sehen sie nicht.
        </p>

        {categories.status === 'loading' && (
          <Card className="gap-0 p-1">
            {[0, 1, 2].map((i) => (
              <div key={i} data-testid="category-row-skeleton" className={ROW}>
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </Card>
        )}

        {categories.status === 'error' && (
          <ErrorState
            title="Kategorien konnten nicht geladen werden"
            description={categories.error?.message}
            onRetry={categories.retry}
          />
        )}

        {ready && ordered.length === 0 && (
          <EmptyState
            icon={Folder}
            title="Noch keine Kategorien"
            description="Leg eine an und sammle darin Rezepte."
            action={newCategoryButton}
          />
        )}

        {ready && moveFailed && (
          <Alert variant="destructive" className="flex items-center justify-between gap-2">
            <AlertTitle className="mb-0">Reihenfolge nicht gespeichert</AlertTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <TriggerButton
                  variant="ghost"
                  size="icon"
                  aria-label="Schließen"
                  className="touch:size-10"
                  onClick={() => {
                    setMoveFailed(false)
                    focusLastMoved()
                  }}
                >
                  <X aria-hidden className="size-4" />
                </TriggerButton>
              </TooltipTrigger>
              <TooltipContent>Schließen</TooltipContent>
            </Tooltip>
          </Alert>
        )}

        {ready && ordered.length > 0 && (
          <Card className="gap-0 p-1">
            <ul aria-label="Meine Kategorien">
              {ordered.map((c, i) => (
                <li key={c.id} className={cn(ROW, 'hover:bg-hover')}>
                  <CategoryMark category={c} size="md" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    {/* Touch: the padding grows the tap area to 40 px inside truncate's clip, the negative margins keep the
                        row height; relative keeps the link above the count for hit-testing. */}
                    <Link
                      to={categoryPageHref(c.id)}
                      className={cn('relative truncate rounded-sm font-medium touch:-my-2.5 touch:py-2.5', FOCUS_RING)}
                    >
                      {c.name}
                    </Link>
                    <span className="text-xs text-muted-foreground tabular-nums">{recipeCount(c.recipes.length)}</span>
                  </div>
                  {/* Not modal: a modal menu opening a modal dialog can leave pointer-events: none on the body. */}
                  <DropdownMenu modal={false}>
                    <Tooltip>
                      {/* Menu trigger outside: postxl's DropdownMenuTrigger doesn't forward refs, so it can't sit under
                          TooltipTrigger asChild. */}
                      <DropdownMenuTrigger asChild>
                        <TooltipTrigger asChild>
                          <TriggerButton
                            ref={(el) => {
                              if (el) menuTriggers.current.set(c.id, el)
                              else menuTriggers.current.delete(c.id)
                            }}
                            variant="ghost"
                            size="iconSm"
                            className="touch:size-10"
                            aria-label={`Aktionen für „${c.name}“`}
                          >
                            <MoreHorizontal aria-hidden className="size-4" />
                          </TriggerButton>
                        </TooltipTrigger>
                      </DropdownMenuTrigger>
                      <TooltipContent>Aktionen</TooltipContent>
                    </Tooltip>
                    {/* Only the editor or a dialog opened from here places focus itself; moves and Escape let Radix return
                        it to this ⋯. */}
                    <DropdownMenuContent
                      align="end"
                      onCloseAutoFocus={(e) => {
                        if (!menuHandsOffFocus.current) return
                        menuHandsOffFocus.current = false
                        e.preventDefault()
                      }}
                    >
                      <DropdownMenuItem
                        className="gap-2 touch:min-h-10"
                        disabled={editorSaving}
                        onSelect={() => {
                          menuHandsOffFocus.current = true
                          openEditor(c)
                        }}
                      >
                        <Pencil aria-hidden className="size-4" />
                        Bearbeiten
                      </DropdownMenuItem>
                      {i > 0 && (
                        <DropdownMenuItem className="gap-2 touch:min-h-10" onSelect={() => move(c, -1)}>
                          <ArrowUp aria-hidden className="size-4" />
                          Nach oben
                        </DropdownMenuItem>
                      )}
                      {i < ordered.length - 1 && (
                        <DropdownMenuItem className="gap-2 touch:min-h-10" onSelect={() => move(c, 1)}>
                          <ArrowDown aria-hidden className="size-4" />
                          Nach unten
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        className="gap-2 touch:min-h-10"
                        disabled={editorSaving}
                        onSelect={() => openDelete(c)}
                      >
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

        {ready && editor && !editedGone && (
          <CategoryEditorCard
            key={editor.key}
            category={editor.target}
            onClose={() => closeEditor(editor)}
            onSavingChange={setEditorSaving}
          />
        )}
      </section>

      {dialog && (
        <DeleteCategoryDialog
          key={dialog.key}
          open={dialog.open}
          onClose={closeDialog}
          category={dialog.target}
          onCloseAutoFocus={restoreFocus}
        />
      )}
    </Page>
  )
}
