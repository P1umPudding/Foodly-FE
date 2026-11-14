import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigationType } from 'react-router-dom'
import { Button } from '@postxl/ui-components'
import { UtensilsCrossed, SearchX } from 'lucide-react'
import { useRecipeSearch } from '../hooks/useRecipeSearch'
import { useCategories, useCurrentUserId, useTags, useIngredients } from '../catalog/CatalogProvider'
import { useListState } from '../list/useListState'
import { groupingCategories, inSelectedCategory } from '../list/filter'
import { hasDisplayableImages } from '../list/rowData'
import { buildSearchQuery } from '../list/query'
import { matchesSearch } from '../list/search'
import { usedIngredients } from '../list/counts'
import { canViewRecipe } from '../api/views'
import { isFacetActive, isFilterActive } from '../list/state'
import { loadCollapsed, saveCollapsed } from '../list/persistence'
import { FilterBar } from '../components/list/FilterBar'
import { MobileListOptions } from '../components/list/MobileListOptions'
import { RecipeListView } from '../components/list/RecipeListView'
import { ListSkeleton, LoadMoreSkeleton } from '../components/list/ListSkeleton'
import { ResultCount } from '../components/list/ResultCount'
import { SearchInput } from '../components/list/SearchInput'
import { SortMenu } from '../components/list/SortMenu'
import { ViewToggles } from '../components/list/ViewToggles'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { fromSearchParams, toSearchParams } from '../list/url'
import { isShellNavState } from '../components/shell/nav'
import { RetryAlert } from '../components/RetryAlert'

const SCROLL_KEY = 'recipeList:scroll'
// Pages the scroll restore loads at most to reach a saved position. Pages that add no height (client-side category
// or text filter) would otherwise load the whole list.
const MAX_RESTORE_PAGES = 10

// The list a scroll position belongs to: its filters/sort/view/search, ignoring how the URL spells them
// (a nav link writes `group=1`, the list itself omits defaults).
function listIdentity(search: string): string {
  return toSearchParams(fromSearchParams(new URLSearchParams(search))).toString()
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
  const ingredientCatalog = Object.values(ingredients.byId)
  const ingredientOptions =
    usedIngredientList.length > 0
      ? usedIngredientList
      : [...ingredientCatalog].sort((a, b) => a.name.localeCompare(b.name))

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
  // A failed next page keeps hasMore (the list is not complete) but pauses paging until the user retries.
  const loadMoreFailed = listReady && search.loadMoreError !== null
  const loadingAnnounced = (listReady && search.loadingMore) || (pending && visible.length === 0 && !loadMoreFailed)
  const filterActive = isFilterActive(categoryState)
  // The reset link names filters, so a plain search doesn't bring it up (the search has its own ✕).
  const facetActive = isFacetActive(categoryState)

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

  // Measure layout into CSS vars so the sticky pieces line up pixel-perfectly:
  //  • --site-nav-h      — exact nav height (its border makes it non-round; a hardcoded
  //                        rem would leave a ~1px drift on first scroll)
  //  • --list-sticky-top — nav + page-header height (where category headers tuck under); the header
  //                        grows when the filter bar wraps, so it is observed, not measured once
  // useLayoutEffect → set before paint (no first-frame jump).
  const headerRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const nav = document.querySelector('header.site-header')
    const root = document.documentElement.style
    const apply = () => {
      if (nav) root.setProperty('--site-nav-h', `${nav.getBoundingClientRect().height}px`)
      root.setProperty('--list-sticky-top', `calc(var(--site-nav-h) + ${el.getBoundingClientRect().height}px)`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    if (nav) ro.observe(nav)
    return () => ro.disconnect()
  }, [])

  // Restore scroll position when returning from a recipe (within the session): track
  // the live position, then re-apply it once the list has rendered. sessionStorage so
  // a fresh load starts at the top. Only for the same list: the shell's sidebar can open
  // a different category from a recipe page, which must start at the top.
  // A position beyond the loaded pages loads more pages first: the browser would cut the scroll to the
  // current page height.
  const scrollRestored = useRef(false)
  const restoreTarget = useRef<{ list: string; y: number } | null>(null)
  const restoreLoads = useRef(0)
  const { search: urlSearch, key: locationKey, state: locationState } = useLocation()
  const listRef = useRef(listIdentity(urlSearch))
  listRef.current = listIdentity(urlSearch)
  const { hasMore, loadMore, loadingMore, loadMoreError } = search

  // A sidebar/tab-bar link opens a list from its start, also while this list stays mounted (where the
  // window would otherwise keep the previous list's position). Only on the click itself: Back to that
  // history entry brings its state along, and must restore. A restore still loading pages ends here.
  const navigationType = useNavigationType()
  const fromShellNav = isShellNavState(locationState) && navigationType !== 'POP'
  const openedFromShellNav = useRef(fromShellNav)
  useEffect(() => {
    if (!fromShellNav) return
    scrollRestored.current = true
    window.scrollTo(0, 0)
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

  // Runs again after every page the restore loads. A reload of the list (listReady false) only pauses it;
  // another list ends it without scrolling. The browser clamps the final scroll when the position stays out of
  // reach (list end, failed page, page cap).
  useEffect(() => {
    if (scrollRestored.current || !listReady) return
    if (restoreTarget.current === null) {
      let saved: { list: string; y: number } | null = null
      try {
        saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null') as { list: string; y: number } | null
      } catch {
        // unreadable entry → start at the top
      }
      if (saved === null || saved.list !== listRef.current || !(saved.y > 0) || openedFromShellNav.current) {
        scrollRestored.current = true
        return
      }
      restoreTarget.current = saved
    }
    const { list, y } = restoreTarget.current
    if (list !== listRef.current) {
      scrollRestored.current = true
      return
    }
    // The skeleton below the list makes the page taller than it is.
    if (loadingMore) return
    const reachable = y <= document.documentElement.scrollHeight - window.innerHeight
    if (!reachable && hasMore && loadMoreError === null && restoreLoads.current < MAX_RESTORE_PAGES) {
      restoreLoads.current++
      loadMore()
      return
    }
    scrollRestored.current = true
    window.scrollTo(0, y)
  }, [listReady, hasMore, loadingMore, loadMoreError, loadMore])

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
  // After a failed page loadMore is a no-op until the retry, so this does not loop.
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || awaitingCategories) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadMore, awaitingCategories])

  return (
    // On phones the shell's bottom padding only clears the tab bar; the extra room lets the last card scroll past
    // the fixed "+" button above it (safe-area inset ready for viewport-fit=cover).
    <div
      data-testid="recipe-list-page"
      className="mx-auto max-w-6xl px-6 pb-10 phone:pb-[calc(6rem+env(safe-area-inset-bottom))]"
    >
      {/* Sticky page header over the scrolling list (solid — no blur). Its measured
          height feeds --list-sticky-top so the category headers tuck right beneath it. */}
      <div ref={headerRef} className="sticky top-(--site-nav-h) z-30 bg-background pb-3 pt-6">
        <h1 className="sr-only">Rezepte</h1>

        {/* Search with the sort menu and view toggles to its right; on phones they sit behind one button. */}
        <div data-testid="search-row" className="flex items-center gap-4 phone:gap-3">
          <SearchInput
            value={state.search}
            onChange={setSearch}
            placeholder="Rezept suchen"
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

        <div className="mt-3">
          <FilterBar
            state={categoryState}
            set={set}
            categories={categories}
            categoriesStatus={categoriesCatalog.status}
            tags={tagList}
            ingredients={ingredientOptions}
            labelIngredients={ingredientCatalog}
          />
        </div>

        {/* min-h fits the 26 px reset link (mockup .link-btn) and ResultCount always renders (invisible while unknown), so the row, and
            with it --list-sticky-top, keeps its height whether or not the link shows. */}
        <div className="mt-3 flex min-h-[26px] items-center gap-2.5 text-sm text-muted-foreground">
          {/* Loading or failed: count 0 + more is the hidden placeholder — no number we don't know. */}
          <ResultCount count={listReady ? visible.length : 0} more={!listReady || search.hasMore} />
          {facetActive && (
            // Mockup link-btn: quiet 12 px text with a hover fill (design.md keeps accent colour off links), hence the
            // text-xs over the size's text-base. On phones the ::after widens the hit area to 40 px (design.md §7); the 7 px
            // above and below fit into the header's mt-3/pb-3.
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                clear()
                // The link unmounts with the filters; keep focus on the page rather than lose it to <body>.
                // Not on phones, where focusing the search would pop the keyboard over the list.
                if (isDesktop) searchInputRef.current?.focus({ preventScroll: true })
              }}
              className="relative h-[26px] px-1.5 text-xs font-medium text-muted-foreground hover:bg-hover hover:text-foreground dark:hover:bg-hover phone:after:absolute phone:after:-inset-y-[7px] phone:after:inset-x-0"
            >
              Alle Filter zurücksetzen
            </Button>
          )}
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
        {pending && visible.length === 0 && !loadMoreFailed && (
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
        {/* The retry unmounts the alert (focus falls back to the page, as with the first-page error); the
            status line below announces the loading instead. */}
        {loadMoreFailed && !search.loadingMore && (
          <div className="pt-3">
            <RetryAlert
              title="Weitere Rezepte konnten nicht geladen werden."
              message={search.loadMoreError?.message}
              onRetry={search.retryLoadMore}
            />
          </div>
        )}
        {/* Always mounted so screen readers pick up the text change. The count stays out of it, or every page
            would be announced. */}
        <p role="status" aria-live="polite" className="sr-only">
          {loadingAnnounced ? 'Weitere Rezepte werden geladen …' : ''}
        </p>
      </div>
    </div>
  )
}
