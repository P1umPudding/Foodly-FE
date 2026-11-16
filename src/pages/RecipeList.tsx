import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigationType } from 'react-router-dom'
import { Button } from '@postxl/ui-components'
import { Search, UtensilsCrossed } from 'lucide-react'
import { useRecipeSearch } from '../hooks/useRecipeSearch'
import { useCategories, useCurrentUserId, useTags, useIngredients } from '../catalog/CatalogProvider'
import { useListState } from '../list/useListState'
import { groupingCategories, inSelectedCategory } from '../list/filter'
import { hasDisplayableImages } from '../list/rowData'
import { buildSearchQuery } from '../list/query'
import { matchesSearch } from '../list/search'
import { byFrequency, recipeIngredientIds, recipeTagIds, usedIngredients } from '../list/counts'
import { canViewRecipe } from '../api/views'
import { isFacetActive, isFilterActive } from '../list/state'
import { loadCollapsed, saveCollapsed } from '../list/persistence'
import { FilterBar } from '../components/list/FilterBar'
import { DesktopListOptions } from '../components/list/DesktopListOptions'
import { MobileListOptions } from '../components/list/MobileListOptions'
import { RecipeListView } from '../components/list/RecipeListView'
import { ListSkeleton, LoadMoreSkeleton } from '../components/list/ListSkeleton'
import { ResultCount } from '../components/list/ResultCount'
import { SearchInput } from '../components/list/SearchInput'
import { ResetLinkButton } from '../components/list/ResetLinkButton'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { fromSearchParams, toSearchParams } from '../list/url'
import { isShellNavState } from '../components/shell/nav'
import { Page } from '../components/shell/Page'
import { EmptyState, ErrorState } from '../components/StateCard'

const SCROLL_KEY = 'recipeList:scroll'

// The saved position of this list, 0 when there is none to restore.
function savedScrollY(list: string): number {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null') as { list: string; y: number } | null
    return saved?.list === list && saved.y > 0 ? saved.y : 0
  } catch {
    // unreadable entry → start at the top
    return 0
  }
}
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
  const ingredientFallback =
    usedIngredientList.length > 0
      ? usedIngredientList
      : [...ingredientCatalog].sort((a, b) => a.name.localeCompare(b.name))
  // Most used on the loaded recipes first (mockup). REST previews carry no sections, so there the ingredients keep
  // the alphabetical fallback; tags come with every preview.
  const ingredientOptions = byFrequency(ingredientFallback, accessibleRecipes, recipeIngredientIds, (i) => i.id)
  const tagOptions = byFrequency(tagList, accessibleRecipes, recipeTagIds, (t) => t.id)

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
      const y = savedScrollY(listRef.current)
      if (y === 0 || openedFromShellNav.current) {
        scrollRestored.current = true
        return
      }
      restoreTarget.current = { list: listRef.current, y }
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
  // preventScroll: the scroll restore above owns the position on this mount. A restore skips the focus: the search
  // scrolls away with the list, and keys typed into a field out of view would silently refilter it. Decided at mount
  // from the saved position alone: a restore that ends up clamped near the top (the list got shorter) leaves the
  // search unfocused, which is harmless.
  const searchInputRef = useRef<HTMLInputElement>(null)
  const focusSearchOnMount = useRef(isDesktop)
  useEffect(() => {
    if (!focusSearchOnMount.current) return
    if (!openedFromShellNav.current && savedScrollY(listRef.current) > 0) return
    searchInputRef.current?.focus({ preventScroll: true })
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
    <Page
      wide
      data-testid="recipe-list-page"
      className="pt-0 pb-10 phone:pt-0 phone:pb-[calc(6rem+env(safe-area-inset-bottom))]"
    >
      {/* Not sticky (mockup): search, filters and count scroll away; only the site header and the category
          headers stick. */}
      <div data-testid="list-toolbar" className="pb-3 pt-6 phone:pt-3">
        <h1 className="sr-only">Rezepte</h1>

        {/* Search with the sort menu and view toggles to its right; on phones they sit behind one button. */}
        <div data-testid="search-row" className="flex items-center gap-2 phone:gap-3">
          <SearchInput
            value={state.search}
            onChange={setSearch}
            placeholder="Rezept suchen"
            label="Rezepte suchen"
            clearLabel="Suche leeren"
            className="min-w-0 flex-1"
            inputClassName="h-[38px]"
            inputRef={searchInputRef}
          />
          {isDesktop ? <DesktopListOptions state={state} set={set} /> : <MobileListOptions state={state} set={set} />}
        </div>

        <div className="mt-3">
          <FilterBar
            state={categoryState}
            set={set}
            categories={categories}
            categoriesStatus={categoriesCatalog.status}
            tags={tagOptions}
            ingredients={ingredientOptions}
            labelIngredients={ingredientCatalog}
          />
        </div>

        {/* min-h fits the 26 px reset link (mockup .link-btn) and ResultCount always renders (invisible while
            unknown), so the row keeps its height and the list doesn't jump whether or not the link shows. */}
        <div className="mt-3 flex min-h-[26px] items-center gap-2.5 text-sm text-muted-foreground">
          {/* Loading or failed: count 0 + more is the hidden placeholder — no number we don't know. */}
          <ResultCount count={listReady ? visible.length : 0} more={!listReady || search.hasMore} />
          {facetActive && (
            // Mockup link-btn: quiet 12 px text with a hover fill (design.md keeps accent colour off links), hence the
            // text-xs over the size's text-base. On phones the ::after widens the hit area to 40 px (design.md §7); the 7 px
            // above and below fit into the header's mt-3/pb-3.
            <ResetLinkButton
              onClick={() => {
                clear()
                // The link unmounts with the filters; keep focus on the page rather than lose it to <body>.
                // Not on phones, where focusing the search would pop the keyboard over the list.
                if (isDesktop) searchInputRef.current?.focus({ preventScroll: true })
              }}
              className="relative phone:after:absolute phone:after:-inset-y-[7px] phone:after:inset-x-0"
            >
              Alle Filter zurücksetzen
            </ResetLinkButton>
          )}
        </div>
      </div>

      <div className="pt-1">
        {categoriesFailed && (
          <div className="pb-4">
            <ErrorState
              title="Kategorien konnten nicht geladen werden"
              description={categoriesCatalog.error?.message}
              onRetry={categoriesCatalog.retry}
            />
          </div>
        )}

        {(search.status === 'loading' || (search.status === 'ready' && awaitingCategories)) && (
          <ListSkeleton
            detail={state.detail}
            count={4}
            denseTiles
            testId={search.status === 'ready' ? 'list-categories-skeleton' : undefined}
          />
        )}

        {search.status === 'error' && (
          <ErrorState
            title="Rezepte konnten nicht geladen werden"
            description={search.error?.message}
            onRetry={search.reload}
          />
        )}

        {/* Pages still to come may hold matches: hold the empty texts back until the list is exhausted.
          The sentinel below stays in view, so loading carries on by itself. */}
        {pending && visible.length === 0 && !loadMoreFailed && (
          <ListSkeleton detail={state.detail} count={1} denseTiles testId="list-pending-skeleton" />
        )}

        {/* Server-side facets already narrow the loaded set, so only the filter state can tell an empty
          collection from a filter without matches. */}
        {allLoaded && visible.length === 0 && !filterActive && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Noch keine Rezepte"
            description="Leg dein erstes Rezept an."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/recipes/new">Neues Rezept</Link>
              </Button>
            }
          />
        )}

        {allLoaded && visible.length === 0 && filterActive && (
          <EmptyState
            icon={Search}
            title={facetActive ? 'Keine Rezepte gefunden' : `Nichts gefunden für „${state.search.trim()}“`}
            description={
              <>
                <p>
                  {facetActive
                    ? 'Lockere die Filter oder such nach etwas anderem.'
                    : 'Prüf die Schreibweise oder setz die Filter zurück.'}
                </p>
                {/* Search ignores ingredients on purpose — point users at the Zutaten filter. */}
                {state.search.trim() !== '' && (
                  <p className="mt-1">
                    Die Suche durchsucht Name, Tags &amp; Abschnitte – nach Zutaten filterst du über den Zutaten-Filter.
                  </p>
                )}
              </>
            }
            action={
              <Button variant="outline" size="sm" onClick={clear}>
                Filter zurücksetzen
              </Button>
            }
          />
        )}

        {listReady && visible.length > 0 && (
          <RecipeListView
            recipes={visible}
            categories={groupingCats}
            allCategories={categories}
            showImages={showImages}
            denseTiles
            detail={state.detail}
            grouped={grouped}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
          />
        )}

        {/* Infinite-scroll trigger + more-pages spinner. */}
        <div ref={sentinelRef} aria-hidden className="h-1" />
        {listReady && search.loadingMore && visible.length > 0 && (
          <LoadMoreSkeleton detail={state.detail} grouped={grouped} denseTiles />
        )}
        {/* The retry unmounts the alert (focus falls back to the page, as with the first-page error); the
            status line below announces the loading instead. */}
        {loadMoreFailed && !search.loadingMore && (
          <div className="pt-3">
            <ErrorState
              compact
              title="Weitere Rezepte konnten nicht geladen werden"
              description={search.loadMoreError?.message}
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
    </Page>
  )
}