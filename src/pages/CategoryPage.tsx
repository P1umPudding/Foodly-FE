// One category: its tinted head and the recipes in it, with the list's search, sort and view but no filters or layout.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigationType, useParams } from 'react-router-dom'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@postxl/ui-components'
import { EllipsisVertical, FolderOpen, Pencil, SearchX } from 'lucide-react'
import { useCategories, useCurrentUserId } from '../catalog/CatalogProvider'
import { CategoryEditDialog } from '../components/category/CategoryEditDialog'
import { CategoryMark } from '../components/category/CategoryMark'
import { ListSkeleton, LoadMoreSkeleton } from '../components/list/ListSkeleton'
import { MobileListOptions } from '../components/list/MobileListOptions'
import { RecipeListView } from '../components/list/RecipeListView'
import { ResultCount } from '../components/list/ResultCount'
import { SearchInput } from '../components/list/SearchInput'
import { SortMenu } from '../components/list/SortMenu'
import { ViewToggles } from '../components/list/ViewToggles'
import { RetryAlert } from '../components/RetryAlert'
import { TriggerButton } from '../components/TriggerButton'
import { isShellNavState, parseCategoryId } from '../components/shell/nav'
import { categoryColorVars } from '../lib/categoryColor'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useRecipeSearch } from '../hooks/useRecipeSearch'
import { canViewRecipe } from '../api/views'
import { buildSearchQuery } from '../list/query'
import { hasDisplayableImages } from '../list/rowData'
import { matchesSearch } from '../list/search'
import { useCategoryPageState } from '../list/useCategoryPageState'
import type { UserCategory } from '../api/protocol'

const recipeCount = (n: number) => `${n} ${n === 1 ? 'Rezept' : 'Rezepte'}`

export function CategoryPage() {
  const { id: idParam } = useParams()
  const id = parseCategoryId(idParam)
  const catalog = useCategories()
  const category = id === null ? undefined : catalog.list.find((c) => c.id === id)

  // The window is the scroll container: opening a category (keyed by id in App.tsx, so a fresh mount) starts at the
  // top. The second effect is for a sidebar click on the category already open, which doesn't remount.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const { key: locationKey, state: locationState } = useLocation()
  const navigationType = useNavigationType()
  const fromShellNav = isShellNavState(locationState) && navigationType !== 'POP'
  useEffect(() => {
    if (fromShellNav) window.scrollTo(0, 0)
  }, [locationKey, fromShellNav])

  return (
    // On phones the extra bottom room lets the last card scroll past the fixed "+" button (as on /recipes, #74).
    <div className="mx-auto max-w-6xl px-6 pt-6 pb-10 phone:px-4 phone:pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Every state has the page's one h1; until the category is known it can only be generic. */}
      {catalog.status !== 'ready' && <h1 className="sr-only">Kategorie</h1>}
      {catalog.status === 'loading' && (
        <>
          <Skeleton data-testid="category-head-skeleton" className="h-24 w-full rounded-lg phone:h-20" />
          <div className="pt-6">
            <ListSkeleton detail="detailed" count={4} />
          </div>
        </>
      )}

      {catalog.status === 'error' && (
        <RetryAlert title="Konnte Kategorien nicht laden" message={catalog.error?.message} onRetry={catalog.retry} />
      )}

      {/* Also when the catalog drops the category while the page is open (deleted through it). */}
      {catalog.status === 'ready' && !category && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <h1 className="font-display text-2xl">Kategorie nicht gefunden</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/recipes">Zu den Rezepten</Link>
          </Button>
        </div>
      )}

      {catalog.status === 'ready' && category && (
        <>
          <CategoryHead category={category} />
          <CategoryRecipes category={category} allCategories={catalog.list} />
        </>
      )}
    </div>
  )
}

function CategoryHead({ category }: { category: UserCategory }) {
  const isDesktop = useIsDesktop()
  // `key` is new per opening: the dialog starts from scratch every time, even when reopened mid-animation.
  const [dialog, setDialog] = useState<{ open: boolean; key: number } | null>(null)
  const openings = useRef(0)
  const trigger = useRef<HTMLButtonElement>(null)
  const openDialog = () => setDialog({ open: true, key: ++openings.current })

  return (
    <div {...categoryColorVars(category)} className="flex items-center gap-4 rounded-lg bg-cat-soft p-5 phone:p-4">
      {/* The mark's own soft fill would vanish on the tinted head: it sits on the card surface, in both themes. The 24 px
          initial (mockup) has no step in the text scale. */}
      <CategoryMark
        category={category}
        size="xl"
        className="size-14 rounded-lg bg-card text-[24px]/none font-bold phone:size-12"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* The display family without .font-display: that class is emitted after the utilities, so its letter-spacing
            would beat the tracking here. */}
        <h1 className="font-(family-name:--font-display) text-2xl/[1.15] font-[650] tracking-[-0.025em] break-words text-cat-ink">
          {category.name}
        </h1>
        {/* Faded only in dark mode: in light, opacity .75 drops this small text below AA (design.md). */}
        <p className="text-sm text-cat-ink tabular-nums dark:opacity-75">
          {recipeCount(category.recipes.length)} · nur für dich sichtbar
        </p>
      </div>
      {isDesktop ? (
        <TriggerButton ref={trigger} variant="outline" size="sm" onClick={openDialog} className="gap-1.5 touch:h-10">
          <Pencil aria-hidden className="size-4" />
          Bearbeiten
        </TriggerButton>
      ) : (
        // Not modal: a modal menu opening a modal dialog can leave pointer-events: none on the body.
        <DropdownMenu modal={false}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <TriggerButton ref={trigger} variant="ghost" size="icon" aria-label={`Aktionen für „${category.name}“`}>
                  <EllipsisVertical aria-hidden className="size-4" />
                </TriggerButton>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Aktionen</TooltipContent>
          </Tooltip>
          {/* The dialog decides where focus goes once it closes. */}
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem className="gap-2" onSelect={openDialog}>
              <Pencil aria-hidden className="size-4" />
              Bearbeiten
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {dialog && (
        <CategoryEditDialog
          key={dialog.key}
          open={dialog.open}
          onClose={() => setDialog((d) => (d ? { ...d, open: false } : d))}
          category={category}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            trigger.current?.focus()
          }}
        />
      )}
    </div>
  )
}

// Mounted once the category is known, so an unknown id sends no search.
function CategoryRecipes({ category, allCategories }: { category: UserCategory; allCategories: UserCategory[] }) {
  const { state, set, setSearch } = useCategoryPageState()
  const currentUserId = useCurrentUserId()
  const isDesktop = useIsDesktop()
  const search = useRecipeSearch({ sort: buildSearchQuery(state).sort, filters: { categories: [category.id] } })

  // The text search runs on the loaded pages, as in the list: typing doesn't refetch.
  const accessible = search.recipes.filter((r) => canViewRecipe(r, currentUserId))
  const visible = accessible.filter((r) => matchesSearch(r, state.search))
  const searching = state.search.trim() !== ''
  const showImages = hasDisplayableImages(accessible)

  const ready = search.status === 'ready'
  const pending = ready && search.hasMore
  const allLoaded = ready && !search.hasMore
  const loadMoreFailed = ready && search.loadMoreError !== null
  const loadingAnnounced = (ready && search.loadingMore) || (pending && visible.length === 0 && !loadMoreFailed)

  // Same infinite scroll as the list: a page that adds no visible row leaves the sentinel in view, so the next one
  // loads by itself; after a failed page loadMore is a no-op until the retry.
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { hasMore, loadMore } = search
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadMore])

  return (
    <>
      <div className="pt-6 pb-3">
        <div className="flex items-center gap-4 phone:gap-3">
          <SearchInput
            value={state.search}
            onChange={setSearch}
            placeholder="Rezept suchen"
            label={`In „${category.name}“ suchen`}
            clearLabel="Suche leeren"
            className="min-w-0 flex-1"
          />
          {isDesktop ? (
            <div className="flex items-center gap-4">
              <SortMenu state={state} set={set} />
              <ViewToggles state={state} set={set} showLayout={false} />
            </div>
          ) : (
            <MobileListOptions state={state} set={set} showLayout={false} />
          )}
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          <ResultCount count={ready ? visible.length : 0} more={!ready || search.hasMore} />
        </div>
      </div>

      <div className="pt-1">
        {search.status === 'loading' && <ListSkeleton detail={state.detail} count={4} />}

        {search.status === 'error' && (
          <RetryAlert title="Konnte Rezepte nicht laden" message={search.error?.message} onRetry={search.reload} />
        )}

        {pending && visible.length === 0 && !loadMoreFailed && (
          <ListSkeleton detail={state.detail} count={1} testId="list-pending-skeleton" />
        )}

        {/* The head counts every recipe in the category; one the user may no longer view is not "nothing in it". */}
        {allLoaded && visible.length === 0 && !searching && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FolderOpen className="size-5 text-muted-foreground/40" />
            <p className="max-w-sm text-muted-foreground">
              {category.recipes.length === 0
                ? `Noch nichts in „${category.name}“. Öffne ein Rezept und füg es über „+“ hinzu.`
                : 'Keine Rezepte, die du sehen kannst.'}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/recipes">Zu den Rezepten</Link>
            </Button>
          </div>
        )}

        {allLoaded && visible.length === 0 && searching && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <SearchX className="size-5 text-muted-foreground/40" />
            <p className="text-muted-foreground">Keine Treffer.</p>
            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
              Suche leeren
            </Button>
          </div>
        )}

        {ready && visible.length > 0 && (
          <RecipeListView
            recipes={visible}
            categories={allCategories}
            showImages={showImages}
            detail={state.detail}
            grouped={false}
            exceptCategoryId={category.id}
          />
        )}

        <div ref={sentinelRef} aria-hidden className="h-1" />
        {ready && search.loadingMore && visible.length > 0 && (
          <LoadMoreSkeleton detail={state.detail} grouped={false} />
        )}
        {loadMoreFailed && !search.loadingMore && (
          <div className="pt-3">
            <RetryAlert
              title="Weitere Rezepte konnten nicht geladen werden."
              message={search.loadMoreError?.message}
              onRetry={search.retryLoadMore}
            />
          </div>
        )}
        <p role="status" aria-live="polite" className="sr-only">
          {loadingAnnounced ? 'Weitere Rezepte werden geladen …' : ''}
        </p>
      </div>
    </>
  )
}
