import { Button, Collapse, CollapseContent, CollapseTrigger } from '@postxl/ui-components'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { RecipeRow } from '../recipe/RecipeRow'
import { RecipeTile } from '../recipe/RecipeTile'
import { categoryColorVars, type CategoryColorInput } from '../../lib/categoryColor'
import { deriveGroups } from '../../list/grouping'
import { recipeCategories } from '../../list/rowData'
import { categoryPageHref } from '../shell/nav'
import type { ReactNode } from 'react'
import type { Recipe, UserCategory, UserCategoryId } from '../../api/protocol'
import type { DetailView } from '../../list/state'

const NONE_COLLAPSED: ReadonlySet<string> = new Set()

type RowOptions = { detail: DetailView; allCategories: UserCategory[]; showImages: boolean; denseTiles: boolean }

// Also used by the page's loading skeletons, so they take the grid's exact shape. `oneRow`
// clips to the first row (later rows get zero height), whatever the column count turns out to be.
// `dense` is the recipe list's narrower grid (mockup `.list-layout .cgrid`); category page and home keep 230 px.
export function TileGrid({
  oneRow = false,
  dense = false,
  children,
}: {
  oneRow?: boolean
  dense?: boolean
  children: ReactNode
}) {
  const cols = dense
    ? 'grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-4'
    : 'grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-x-5'
  const rows = oneRow
    ? 'auto-rows-[0] grid-rows-[auto] overflow-hidden'
    : `${dense ? 'gap-y-6' : 'gap-y-7'} phone:gap-y-5`
  return (
    <div data-testid="tile-grid" className={`grid ${cols} phone:grid-cols-2 phone:gap-x-3 ${rows}`}>
      {children}
    </div>
  )
}

// A group's indented body with its 2px line in the category's dot colour (`neutral`: the uncategorised group's
// border grey). `lineless` keeps only the indent, for placeholders that must line up with a group's content.
export function GroupIndent({
  lineless = false,
  neutral = false,
  children,
}: {
  lineless?: boolean
  neutral?: boolean
  children: ReactNode
}) {
  const line = lineless ? 'border-transparent' : neutral ? 'border-border' : 'border-cat-dot'
  return (
    // line nudged right (ml-[7px]) so the 2px rule centres under the chevron's bottom tip
    <div className={`ml-[7px] border-l-2 pl-3 ${line}`}>{children}</div>
  )
}

function Rows({
  recipes,
  detail,
  allCategories,
  showImages,
  denseTiles,
  exceptCategoryId = null,
}: RowOptions & { recipes: Recipe[]; exceptCategoryId?: UserCategoryId | null }) {
  if (detail === 'tiles') {
    return (
      <TileGrid dense={denseTiles}>
        {recipes.map((r) => (
          <RecipeTile key={r.id} recipe={r} categories={recipeCategories(r, allCategories, exceptCategoryId)} />
        ))}
      </TileGrid>
    )
  }

  const compact = detail === 'compact'
  // Flat rows, flush like a real list; the hover fill separates them.
  return (
    <div>
      {recipes.map((r) => (
        <RecipeRow
          key={r.id}
          recipe={r}
          compact={compact}
          categories={recipeCategories(r, allCategories, exceptCategoryId)}
          showImages={showImages}
        />
      ))}
    </div>
  )
}

// `colors` null (uncategorised) → no data-cat, so the neutral --cat-* defaults apply.
function CategoryGroup({
  categoryId,
  name,
  colors,
  recipes,
  rowOptions,
  open,
  onOpenChange,
}: {
  categoryId: UserCategoryId | null
  name: string
  colors: CategoryColorInput | null
  recipes: Recipe[]
  rowOptions: RowOptions
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Collapse open={open} onOpenChange={onOpenChange} className="group/cat" {...(colors && categoryColorVars(colors))}>
      {/* Sticky so the category stays labelled while scrolling; top clears the site header. Solid (not frosted): two
          stacked backdrop-blurs would seam against the page header. "Öffnen ›" sits beside the trigger, not in it, so
          it opens the category page without folding the group (and no link nests in a button). Neutral name: the
          colour lives in the dot and the line only. */}
      <div className="group/head sticky top-[var(--list-sticky-top,var(--site-nav-h))] z-20 flex h-8 items-center justify-between gap-2 bg-background touch:h-10">
        {/* A real (postxl) Button as the trigger — Button asChild merges onto the Radix trigger (which forwards refs),
            so we get button semantics + cursor-pointer; h-full makes the whole head height the tap target. */}
        <Button
          asChild
          variant="ghost"
          className="h-full min-w-0 justify-start gap-2 rounded-none bg-background px-0 py-0 text-sm font-semibold text-foreground hover:bg-background hover:text-foreground dark:hover:bg-background has-[>svg]:px-0"
        >
          <CollapseTrigger>
            <ChevronDown className="h-4 w-4 shrink-0 text-subtle-foreground transition-transform group-data-[state=closed]/cat:-rotate-90" />
            {categoryId !== null && (
              <span aria-hidden data-testid="group-dot" className="ml-0.5 size-2 shrink-0 rounded-full bg-cat-dot" />
            )}
            <span
              data-testid="group-name"
              className="min-w-0 truncate text-foreground group-data-[state=closed]/cat:font-medium group-data-[state=closed]/cat:text-muted-foreground"
            >
              {name}
            </span>
            <span className="tabular-nums font-normal text-muted-foreground">{recipes.length}</span>
          </CollapseTrigger>
        </Button>
        {/* Desktop: appears on hover/focus only; touch devices and phones have no hover, so it always shows there. */}
        {categoryId !== null && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover/head:opacity-100 focus-visible:opacity-100 hover:text-foreground phone:opacity-100 touch:h-10 touch:opacity-100"
          >
            <Link to={categoryPageHref(categoryId)} aria-label={`Öffnen: „${name}“`}>
              Öffnen ›
            </Link>
          </Button>
        )}
      </div>
      <CollapseContent>
        <GroupIndent neutral={categoryId === null}>
          {/* tiles get a little air under the head (mockup `.lgroup .cgrid` padding) */}
          <div className={rowOptions.detail === 'tiles' ? 'pt-1.5 pb-1' : undefined}>
            <Rows recipes={recipes} exceptCategoryId={categoryId} {...rowOptions} />
          </div>
        </GroupIndent>
      </CollapseContent>
    </Collapse>
  )
}

// Collapse is controlled by the page (so the toolbar's collapse-all shares the
// state). `collapsed` holds the keys that are closed; empty = all open.
// `categories` drive the grouping and may be narrowed by the category filter;
// `allCategories` (unfiltered) feed the rows' dots so a filter never hides them.
// `showImages` is decided by the page from all loaded recipes. `denseTiles`: the recipe list's narrower tile grid. `exceptCategoryId` drops that category's dot from the
// flat rows (a category page: every row is in it); grouped rows already leave out their own group's dot.
export function RecipeListView({
  recipes,
  categories,
  allCategories = categories,
  showImages = false,
  denseTiles = false,
  detail,
  grouped = true,
  collapsed = NONE_COLLAPSED,
  onCollapsedChange,
  exceptCategoryId = null,
}: {
  recipes: Recipe[]
  categories: UserCategory[]
  allCategories?: UserCategory[]
  showImages?: boolean
  denseTiles?: boolean
  detail: DetailView
  grouped?: boolean
  collapsed?: ReadonlySet<string>
  onCollapsedChange?: (next: Set<string>) => void
  exceptCategoryId?: UserCategoryId | null
}) {
  const rowOptions: RowOptions = { detail, allCategories, showImages, denseTiles }

  // Flat list: one sorted sequence (or one grid), no category headers or collapse.
  if (!grouped) return <Rows recipes={recipes} exceptCategoryId={exceptCategoryId} {...rowOptions} />

  const groups = deriveGroups(recipes, categories)

  const setOpen = (key: string, open: boolean) => {
    if (!onCollapsedChange) return
    const next = new Set(collapsed)
    if (open) next.delete(key)
    else next.add(key)
    onCollapsedChange(next)
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <CategoryGroup
          key={g.key}
          categoryId={g.categoryId}
          name={g.name}
          colors={g.colors}
          recipes={g.recipes}
          rowOptions={rowOptions}
          open={!collapsed.has(g.key)}
          onOpenChange={(o) => setOpen(g.key, o)}
        />
      ))}
    </div>
  )
}
