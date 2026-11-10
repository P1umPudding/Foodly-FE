import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigationType } from 'react-router-dom'
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
} from '@postxl/ui-components'
import { Filter, UtensilsCrossed, SearchX } from 'lucide-react'
import { useRecipeSearch } from '../hooks/useRecipeSearch'
import { useCategories, useCurrentUserId, useTags, useIngredients } from '../catalog/CatalogProvider'
import { useListState } from '../list/useListState'
import { UNCATEGORIZED_ID, groupingCategories, inSelectedCategory } from '../list/filter'
import { hasDisplayableImages } from '../list/rowData'
import { buildSearchQuery } from '../list/query'
import { matchesSearch } from '../list/search'
import { usedIngredients } from '../list/counts'
import { canViewRecipe } from '../api/views'
import { activeFacetCount, isFilterActive, type DetailView } from '../list/state'
import { loadCollapsed, saveCollapsed } from '../list/persistence'
import { ActiveFilters } from '../components/list/ActiveFilters'
import { FilterControls } from '../components/list/FilterControls'
import { MobileListOptions } from '../components/list/MobileListOptions'
import { GroupIndent, RecipeListView, TileGrid } from '../components/list/RecipeListView'
import { ResultCount } from '../components/list/ResultCount'
import { SearchInput } from '../components/list/SearchInput'
import { SortMenu } from '../components/list/SortMenu'
import { ViewToggles } from '../components/list/ViewToggles'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { fromSearchParams, toSearchParams } from '../list/url'
import { isShellNavState } from '../components/shell/nav'
import { RetryAlert } from '../components/RetryAlert'

const SCROLL_KEY = 'recipeList:scroll'

// The list a scroll position belongs to: its filters/sort/view/search, ignoring how the URL spells them
// (a nav link writes `group=1`, the list itself omits defaults).
function listIdentity(search: string): string {
  return toSearchParams(fromSearchParams(new URLSearchParams(search))).toString()
}

// Placeholders in the shape of the chosen view, so nothing jumps when the recipes arrive.
function ListSkeleton({
  detail,
  count,
  testId,
  oneRow = false,
}: {
  detail: DetailView
  count: number
  testId?: string
  oneRow?: boolean
}) {
  const items = Array.from({ length: count }, (_, i) => i)
  if (detail === 'tiles') {
    return (
      <div data-testid={testId}>
        <TileGrid oneRow={oneRow}>
          {items.map((i) => (
            <Skeleton key={i} data-testid="tile-skeleton" className="aspect-[4/3] w-full rounded-lg" />
          ))}
        </TileGrid>
      </div>
    )
  }
  const compact = detail === 'compact'
  return (
    <div data-testid={testId} className={compact ? 'space-y-0.5' : 'space-y-3'}>
      {items.map((i) => (
        <Skeleton
          key={i}
          data-testid="row-skeleton"
          className={`w-full ${compact ? 'h-8 rounded-md' : 'h-18 rounded-lg'}`}
        />
      ))}
    </div>
  )
}

function LoadMoreSkeleton({ detail, grouped }: { detail: DetailView; grouped: boolean }) {
  if (detail !== 'tiles') {
    return (
      <div className="pt-3">
        <ListSkeleton detail={detail} count={1} testId="list-more-skeleton" />
      </div>
    )
  }
  // One row, as many tiles as the grid has columns (the list column fits at most 4).
  const tiles = <ListSkeleton detail="tiles" count={4} testId="list-more-skeleton" oneRow />
  // Grouped: indented like a group's grid, so the skeleton columns match the tiles above.
  return <div className="pt-7 phone:pt-5">{grouped ? <GroupIndent lineless>{tiles}</GroupIndent> : tiles}</div>
}

export function RecipeList() {
  const { state, set, setSearch, clear } = useListState()
  const currentUserId = useCurrentUserId()
  const isDesktop = useIsDesktop()
  const tags = useTags()
  const ingredients = useIngredients()

  // Server-side filter/sort/pagination. Query changes (by value) reset to page 1.
  const search = useRecipeSearch(buildSearchQuery(state))
  const categoriesCatalog = useCategories()

  // Access guard is redundant (backend enforces it) but harmless.
  const accessibleRecipes = search.recipes.filter((r) => canViewRecipe(r, currentUserId))
  const categories = categoriesCatalog.list

  // Category selection and grouping need the categories. While they load, the list waits for them instead of
  // briefly showing everything as "Ohne Kategorie" or "Keine Treffer" (and paging through every page looking
  // for matches). When they failed, the list works without them: the selection is ignored (it stays in the
  // URL and applies again after a successful retry) and the grouped view shows a flat list.
  const categoriesFailed = categoriesCatalog.status === 'error'
  const awaitingCategories = categoriesCatalog.status === 'loading' && (state.categories.length > 0 || state.grouped)
  const categoryState = categoriesFailed ? { ...state, categories: [] } : state
  const grouped = state.grouped && !categoriesFailed
  const tagList = Object.values(tags.byId)

  // Ingredient facet: prefer ingredients actually present on loaded recipes; when
  // those carry no ingredient data (REST previews), fall back to the full catalog
  // so the ingredient filter stays usable.
  const usedIngredientList = usedIngredients(accessibleRecipes, ingredients.byId)
  const ingredientOptions =
    usedIngredientList.length > 0
      ? usedIngredientList
      : Object.values(ingredients.byId).sort((a, b) => a.name.localeCompare(b.name))

  // The server (or the mock) applies tag/ingredient/duration/role/collab facets and
  // sorting. The client narrows the loaded set by category selection and free-text
  // search. Category stays client-side (driven by the mocked category catalog):
  // selecting one must HIDE non-matching recipes, not dump them into the grouped
  // view's "Ohne Kategorie" bucket.
  const visible = accessibleRecipes.filter(
    (r) => inSelectedCategory(r, categoryState.categories, categories) && matchesSearch(r, state.search),
  )

  const listReady = search.status === 'ready' && !awaitingCategories
  const pending = listReady && search.hasMore
  const allLoaded = listReady && !search.hasMore
  const filterActive = isFilterActive(categoryState)

  // Count of accessible recipes in no category — drives the "Ohne Kategorie" filter.
  const categorizedIds = new Set(categories.flatMap((c) => c.recipes))
  const uncategorizedCount = accessibleRecipes.filter((r) => !categorizedIds.has(r.id)).length

  // Per-category collapse state (clicking a sticky group header folds that group),
  // persisted per user. Closed group keys; empty = all open. First visit (nothing
  // stored) starts with the "Ohne Kategorie" inbox folded.
  const groupingCats = groupingCategories(categories, categoryState.categories)
  // From every loaded (viewable) recipe, not the filtered view: loadMore only appends,
  // so the column never vanishes while scrolling; a new query recomputes it.
  const showImages = hasDisplayableImages(accessibleRecipes)
  const [collapsed, setCollapsedState] = useState<Set<string>>(() => new Set(loadCollapsed(currentUserId) ?? ['uncat']))
  const setCollapsed = (next: Set<string>) => {
    setCollapsedState(next)
    saveCollapsed(currentUserId, next)
  }

  // Measure layout into CSS vars so the sticky/fixed pieces line up pixel-perfectly:
  //  • --site-nav-h     — exact nav height (its border makes it non-round; a hardcoded
  //                       rem would leave a ~1px drift on first scroll)
  //  • --list-sticky-top — nav + page-header height (where category headers tuck under)
  //  • --list-search-offset — search row's offset inside the header (rail content aligns there)
  //  • --rail-left / --rail-width — geometry of the rail's reserved column, so the rail can
  //                       be position:fixed (anchored to the viewport, never dragged by the
  //                       list's end) yet sit exactly over its column.
  // useLayoutEffect → set before paint (no first-frame jump).
  const headerRef = useRef<HTMLDivElement>(null)
  const searchRowRef = useRef<HTMLDivElement>(null)
  const railSlotRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const nav = document.querySelector('header.site-header')
    const root = document.documentElement.style
    const apply = () => {
      if (nav) root.setProperty('--site-nav-h', `${nav.getBoundingClientRect().height}px`)
      root.setProperty('--list-sticky-top', `calc(var(--site-nav-h) + ${el.getBoundingClientRect().height}px)`)
      if (searchRowRef.current) {
        const offset = searchRowRef.current.getBoundingClientRect().top - el.getBoundingClientRect().top
        root.setProperty('--list-search-offset', `${offset}px`)
      }
      if (railSlotRef.current) {
        const r = railSlotRef.current.getBoundingClientRect()
        root.setProperty('--rail-left', `${r.left}px`)
        root.setProperty('--rail-width', `${r.width}px`)
      }
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    if (nav) ro.observe(nav)
    if (railSlotRef.current) ro.observe(railSlotRef.current)
    // Collapsing the shell's sidebar widens <main> but can leave the centered column's size unchanged
    // (it is capped at max-w-6xl), so it would move without any observed resize.
    const main = document.querySelector('main')
    if (main) ro.observe(main)
    // ResizeObserver catches size changes; a window resize can move the centered column
    // without resizing it, so re-measure --rail-left/width then too.
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  // Restore scroll position when returning from a recipe (within the session): track
  // the live position, then re-apply it once the list has rendered. sessionStorage so
  // a fresh load starts at the top. Only for the same list: the shell's sidebar can open
  // a different category from a recipe page, which must start at the top.
  const scrollRestored = useRef(false)
  const { search: urlSearch, key: locationKey, state: locationState } = useLocation()
  const listRef = useRef(listIdentity(urlSearch))
  listRef.current = listIdentity(urlSearch)

  // A sidebar/tab-bar link opens a list from its start, also while this list stays mounted (where the
  // window would otherwise keep the previous list's position). Only on the click itself: Back to that
  // history entry brings its state along, and must restore.
  const navigationType = useNavigationType()
  const fromShellNav = isShellNavState(locationState) && navigationType !== 'POP'
  const openedFromShellNav = useRef(fromShellNav)
  useEffect(() => {
    if (fromShellNav) window.scrollTo(0, 0)
  }, [locationKey, fromShellNav])
  useEffect(() => {
    const onScroll = () => {
      // Until the restore has run, scroll events come from the short loading page clamping the old
      // position, not from the user; recording them would overwrite the position to restore.
      if (!scrollRestored.current) return
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ list: listRef.current, y: window.scrollY }))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (scrollRestored.current || !listReady) return
    scrollRestored.current = true
    try {
      const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null') as { list: string; y: number } | null
      const sameList = saved !== null && saved.list === listRef.current
      if (sameList && saved.y > 0 && !openedFromShellNav.current) window.scrollTo(0, saved.y)
    } catch {
      // unreadable entry → start at the top
    }
  }, [listReady])

  // Desktop: the search is ready to type into when the page opens. Not on phones, where focusing would pop the
  // keyboard over the list. Only the first render's viewport counts, so resizing never steals focus.
  // preventScroll: the scroll restore above owns the position on this mount.
  const searchInputRef = useRef<HTMLInputElement>(null)
  const focusSearchOnMount = useRef(isDesktop)
  useEffect(() => {
    if (focusSearchOnMount.current) searchInputRef.current?.focus({ preventScroll: true })
  }, [])

  // Load the next page when a sentinel near the list end scrolls into view. The effect re-subscribes
  // whenever loadMore changes (every page), and a fresh observer reports the sentinel's current state:
  // a page that adds no visible row leaves the sentinel in view, so the next page loads by itself.
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !search.hasMore || awaitingCategories) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) search.loadMore()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [search.hasMore, search.loadMore, awaitingCategories])

  const filters = (
    <FilterControls
      state={categoryState}
      set={set}
      categories={categories}
      categoriesLoading={categoriesCatalog.status === 'loading'}
      categoriesFailed={categoriesFailed}
      onToggleCategory={(id) =>
        set({
          categories: state.categories.includes(id)
            ? state.categories.filter((x) => x !== id)
            : [...state.categories, id],
        })
      }
      uncategorizedCount={uncategorizedCount}
      tags={tagList}
      ingredients={ingredientOptions}
    />
  )

  return (
    <>
      {/* Two columns: the list (with its own sticky header) and the filter rail's
          reserved slot. The list holds a min width so that, once space gets tight, the
          RAIL shrinks (18→13.5rem) instead of only the list. From lg, not md: next to the
          shell's sidebar both columns (~43rem) don't fit at 768 px. On phones the shell's bottom
          padding only clears the tab bar; the extra room lets the last card scroll past the fixed
          "+" button above it (safe-area inset ready for viewport-fit=cover). */}
      <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-10 phone:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:grid-cols-[minmax(28rem,1fr)_minmax(13.5rem,18rem)]">
        <div className="min-w-0">
          {/* Sticky page header over the scrolling list (solid — no blur). Its measured
            height feeds --list-sticky-top so the category headers tuck right beneath it. */}
          <div ref={headerRef} className="sticky top-(--site-nav-h) z-30 bg-background pb-3 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-4">
                <h1 className="sr-only">Rezepte</h1>
                {/* Loading or failed: count 0 + more is the hidden placeholder — no number we don't know. */}
                <ResultCount count={listReady ? visible.length : 0} more={!listReady || search.hasMore} />
              </div>
              {/* Mobile-only filter drawer trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 lg:hidden">
                    <Filter className="h-4 w-4" />
                    Filter
                    {activeFacetCount(categoryState) > 0 && (
                      <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1 tabular-nums">
                        {activeFacetCount(categoryState)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[20rem] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filter</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">{filters}</div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Search with the sort menu and view toggles to its right; on phones they sit behind one button. */}
            <div ref={searchRowRef} data-testid="search-row" className="mt-2.5 flex items-center gap-4 phone:gap-3">
              <SearchInput
                value={state.search}
                onChange={setSearch}
                placeholder="Suchen…"
                label="Rezepte suchen"
                clearLabel="Suche leeren"
                className="min-w-0 flex-1"
                inputRef={searchInputRef}
              />
              {isDesktop ? (
                <div className="flex items-center gap-4">
                  <SortMenu state={state} set={set} />
                  <ViewToggles state={state} set={set} />
                </div>
              ) : (
                <MobileListOptions state={state} set={set} />
              )}
            </div>

            {/* Removable chips for the active filters + reset-all. */}
            <div className="mt-5 empty:mt-0">
              {/* While the categories load, their chips would have no name yet. */}
              <ActiveFilters
                state={
                  awaitingCategories
                    ? { ...state, categories: state.categories.filter((id) => id === UNCATEGORIZED_ID) }
                    : categoryState
                }
                set={set}
                clear={clear}
                categories={categories}
                tags={tagList}
                ingredients={ingredientOptions}
              />
            </div>
          </div>

          <div className="pt-1">
            {categoriesFailed && (
              <div className="pb-4">
                <RetryAlert
                  title="Konnte Kategorien nicht laden"
                  message={categoriesCatalog.error?.message}
                  onRetry={categoriesCatalog.retry}
                />
              </div>
            )}

            {(search.status === 'loading' || (search.status === 'ready' && awaitingCategories)) && (
              <ListSkeleton
                detail={state.detail}
                count={4}
                testId={search.status === 'ready' ? 'list-categories-skeleton' : undefined}
              />
            )}

            {search.status === 'error' && (
              <RetryAlert title="Konnte Rezepte nicht laden" message={search.error?.message} onRetry={search.reload} />
            )}

            {/* Pages still to come may hold matches: hold the empty texts back until the list is exhausted.
              The sentinel below stays in view, so loading carries on by itself. */}
            {pending && visible.length === 0 && (
              <ListSkeleton detail={state.detail} count={1} testId="list-pending-skeleton" />
            )}

            {/* Server-side facets already narrow the loaded set, so only the filter state can tell an empty
              collection from a filter without matches. */}
            {allLoaded && visible.length === 0 && !filterActive && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <UtensilsCrossed className="size-5 text-muted-foreground/40" />
                <p className="text-muted-foreground">Noch keine Rezepte.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/recipes/new">Neues Rezept</Link>
                </Button>
              </div>
            )}

            {allLoaded && visible.length === 0 && filterActive && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <SearchX className="size-5 text-muted-foreground/40" />
                <p className="text-muted-foreground">Keine Treffer für die aktuellen Filter.</p>
                {/* Search ignores ingredients on purpose — point users at the Zutaten filter. */}
                {state.search.trim() !== '' && (
                  <p className="max-w-xs text-sm text-muted-foreground/80">
                    Die Suche durchsucht Name, Tags &amp; Abschnitte – nach Zutaten filterst du über den Zutaten-Filter.
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={clear}>
                  Filter zurücksetzen
                </Button>
              </div>
            )}

            {listReady && visible.length > 0 && (
              <RecipeListView
                recipes={visible}
                categories={groupingCats}
                allCategories={categories}
                showImages={showImages}
                detail={state.detail}
                grouped={grouped}
                collapsed={collapsed}
                onCollapsedChange={setCollapsed}
              />
            )}

            {/* Infinite-scroll trigger + more-pages spinner. */}
            <div ref={sentinelRef} aria-hidden className="h-1" />
            {listReady && search.loadingMore && visible.length > 0 && (
              <LoadMoreSkeleton detail={state.detail} grouped={grouped} />
            )}
          </div>
        </div>

        {/* Reserves the rail's column; the real rail is position:fixed over it. */}
        <div ref={railSlotRef} aria-hidden className="hidden lg:block" />
      </div>

      {/* Desktop rail: position:fixed over its reserved column, anchored to the viewport
          so the end of a short list can't drag it — only its own content scrolls. The
          non-scrolling spacer aligns the content with the search bar; overflow lives on
          the content (scrollbar starts at the content, not up in the spacer). */}
      <aside className="fixed top-(--site-nav-h) left-(--rail-left) hidden max-h-[calc(100vh-var(--site-nav-h)-1rem)] w-(--rail-width) flex-col lg:flex">
        <div className="h-(--list-search-offset,4.5rem) shrink-0" />
        {/* -ml-1 pl-1: the scroll box clips sideways too, so give the toggles' 3-px focus ring room on the left. */}
        <div className="-ml-1 min-h-0 flex-1 overflow-y-auto pb-4 pl-1">{filters}</div>
      </aside>
    </>
  )
}
