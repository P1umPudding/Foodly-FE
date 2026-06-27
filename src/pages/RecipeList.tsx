import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useCurrentUserId, useTags, useIngredients } from '../catalog/CatalogProvider'
import { useListState } from '../list/useListState'
import { filterRecipes, groupingCategories } from '../list/filter'
import { sortRecipes } from '../list/sort'
import { usedIngredients } from '../list/counts'
import { canViewRecipe } from '../api/views'
import { activeFacetCount, isFilterActive } from '../list/state'
import { loadCollapsed, saveCollapsed } from '../list/persistence'
import { ActiveFilters } from '../components/list/ActiveFilters'
import { FilterControls } from '../components/list/FilterControls'
import { ListToolbar } from '../components/list/ListToolbar'
import { RecipeListView } from '../components/list/RecipeListView'
import { ResultCount } from '../components/list/ResultCount'
import { SearchInput } from '../components/list/SearchInput'

const SCROLL_KEY = 'recipeList:scrollY'

export function RecipeList() {
  const [nonce, setNonce] = useState(0)
  const recipesReq = useRequest(() => foodly.listRecipes(), [nonce])
  const categoriesReq = useRequest(() => foodly.listCategories(), [nonce])
  const { state, set, clear } = useListState()
  const currentUserId = useCurrentUserId()
  const tags = useTags()
  const ingredients = useIngredients()

  // Access guard: the list only ever shows recipes the current user can see.
  // Everything below (counts, ingredient facet, filtering) works off this set.
  const accessibleRecipes = (recipesReq.data ?? []).filter((r) => canViewRecipe(r, currentUserId))
  const categories = categoriesReq.data ?? []
  const tagList = Object.values(tags.byId)
  const usedIngredientList = usedIngredients(accessibleRecipes, ingredients.byId)
  const visible = sortRecipes(filterRecipes(accessibleRecipes, state, currentUserId, categories), state, currentUserId)

  // Count of accessible recipes in no category — drives the "Ohne Kategorie" filter.
  const categorizedIds = new Set(categories.flatMap((c) => c.recipes))
  const uncategorizedCount = accessibleRecipes.filter((r) => !categorizedIds.has(r.id)).length

  // Per-category collapse state (clicking a sticky group header folds that group),
  // persisted per user. Closed group keys; empty = all open. First visit (nothing
  // stored) starts with the "Ohne Kategorie" inbox folded.
  const groupingCats = groupingCategories(categories, state.categories)
  const [collapsed, setCollapsedState] = useState<Set<string>>(() => new Set(loadCollapsed(currentUserId) ?? ['uncat']))
  const setCollapsed = (next: Set<string>) => {
    setCollapsedState(next)
    saveCollapsed(currentUserId, next)
  }

  // Measure the exact site-nav height (its border makes it a non-round px value, so a
  // hardcoded rem leaves a ~1px sticky drift on first scroll) and the variable-height
  // page header, exposing both as CSS vars so the header / category headers / rail stick
  // pixel-perfectly beneath. useLayoutEffect → set before paint (no first-frame jump).
  const headerRef = useRef<HTMLDivElement>(null)
  const searchRowRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const nav = document.querySelector('header.site-header')
    const root = document.documentElement.style
    const apply = () => {
      if (nav) root.setProperty('--site-nav-h', `${nav.getBoundingClientRect().height}px`)
      root.setProperty('--list-sticky-top', `calc(var(--site-nav-h) + ${el.getBoundingClientRect().height}px)`)
      // Where the search row sits inside the header → the rail aligns its content there.
      if (searchRowRef.current) {
        const offset = searchRowRef.current.getBoundingClientRect().top - el.getBoundingClientRect().top
        root.setProperty('--list-search-offset', `${offset}px`)
      }
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    if (nav) ro.observe(nav)
    return () => ro.disconnect()
  }, [])

  // Restore scroll position when returning from a recipe (within the session): track
  // the live position, then re-apply it once the list has rendered. sessionStorage so
  // a fresh load starts at the top.
  useEffect(() => {
    const onScroll = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollRestored = useRef(false)
  useEffect(() => {
    if (scrollRestored.current || recipesReq.status !== 'ready') return
    scrollRestored.current = true
    const y = Number(sessionStorage.getItem(SCROLL_KEY) ?? '')
    if (y > 0) window.scrollTo(0, y)
  }, [recipesReq.status])

  const filters = (
    <FilterControls
      state={state}
      set={set}
      categories={categories}
      categoriesLoading={categoriesReq.status === 'loading'}
      onToggleCategory={(id) =>
        set({
          categories: state.categories.includes(id)
            ? state.categories.filter((x) => x !== id)
            : [...state.categories, id],
        })
      }
      uncategorizedCount={uncategorizedCount}
      tags={tagList}
      ingredients={usedIngredientList}
    />
  )

  return (
    // Two columns: the list (with its own sticky header) and the filter rail. The
    // list holds a min width so that, once space gets tight, the RAIL shrinks
    // (18→13.5rem) instead of only the list.
    <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-10 md:grid-cols-[minmax(28rem,1fr)_minmax(13.5rem,18rem)]">
      <div className="min-w-0">
        {/* Sticky page header over the scrolling list (solid — no blur). Its measured
            height feeds --list-sticky-top so the category headers tuck right beneath it. */}
        <div ref={headerRef} className="sticky top-[var(--site-nav-h)] z-30 bg-background pb-3 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-4">
              <h1 className="font-display text-3xl text-foreground">Rezepte</h1>
              <ResultCount matching={visible.length} total={accessibleRecipes.length} />
            </div>
            {/* Mobile-only filter drawer trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 md:hidden">
                  <Filter className="h-4 w-4" />
                  Filter
                  {activeFacetCount(state) > 0 && (
                    <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1 tabular-nums">
                      {activeFacetCount(state)}
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

          {/* Search bar with the sort/view toolbar to its right (drops below on mobile). */}
          <div ref={searchRowRef} className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={state.search}
              onChange={(v) => set({ search: v })}
              placeholder="Name, Tag oder Abschnitt suchen…"
              clearLabel="Suche leeren"
              className="flex-1"
            />
            {/* Single "Ansicht" menu: sort + density. */}
            <div className="flex justify-end sm:block">
              <ListToolbar state={state} set={set} />
            </div>
          </div>

          {/* Removable chips for the active filters + reset-all. */}
          <div className="mt-5 empty:mt-0">
            <ActiveFilters
              state={state}
              set={set}
              clear={clear}
              categories={categories}
              tags={tagList}
              ingredients={usedIngredientList}
            />
          </div>
        </div>

        <div className="pt-1">
          {recipesReq.status === 'loading' && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
              ))}
            </div>
          )}

          {recipesReq.status === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>Konnte Rezepte nicht laden</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>{recipesReq.error?.message}</span>
                <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
                  Erneut versuchen
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {recipesReq.status === 'ready' && accessibleRecipes.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Noch keine Rezepte.</p>
            </div>
          )}

          {recipesReq.status === 'ready' && accessibleRecipes.length > 0 && visible.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <SearchX className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Keine Treffer für die aktuellen Filter.</p>
              {/* Search ignores ingredients on purpose — point users at the Zutaten filter. */}
              {state.search.trim() !== '' && (
                <p className="max-w-xs text-sm text-muted-foreground/80">
                  Die Suche durchsucht Name, Tags &amp; Abschnitte – nach Zutaten filterst du über den Zutaten-Filter.
                </p>
              )}
              {isFilterActive(state) && (
                <Button variant="outline" size="sm" onClick={clear}>
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          )}

          {recipesReq.status === 'ready' && visible.length > 0 && (
            <RecipeListView
              recipes={visible}
              categories={groupingCats}
              detail={state.detail}
              grouped={state.grouped}
              activeRole={state.role}
              activeCollab={state.collab}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
            />
          )}
        </div>
      </div>

      {/* Desktop rail. Sticks beside the header and only ever scrolls INSIDE itself —
          the box is capped to the viewport, a non-scrolling spacer aligns its content
          with the search bar, and overflow lives on the content (so the scrollbar
          starts at the content, not up in the spacer). */}
      <aside className="hidden md:sticky md:top-[var(--site-nav-h)] md:flex md:max-h-[calc(100vh-var(--site-nav-h)-1rem)] md:flex-col md:self-start">
        <div className="h-[var(--list-search-offset,4.5rem)] shrink-0" />
        <div className="min-h-0 flex-1 overflow-y-auto pb-4">{filters}</div>
      </aside>
    </div>
  )
}
