import { Button, Collapse, CollapseContent, CollapseTrigger } from '@postxl/ui-components'
import { ChevronDown } from 'lucide-react'
import { RecipeRow } from '../recipe/RecipeRow'
import { RecipeTile } from '../recipe/RecipeTile'
import { categoryColorVars, type CategoryColorInput } from '../../lib/categoryColor'
import { deriveGroups } from '../../list/grouping'
import { recipeCategories } from '../../list/rowData'
import type { ReactNode } from 'react'
import type { Recipe, UserCategory, UserCategoryId } from '../../api/protocol'
import type { DetailView } from '../../list/state'

const NONE_COLLAPSED: ReadonlySet<string> = new Set()

type RowOptions = { detail: DetailView; allCategories: UserCategory[]; showImages: boolean }

// Also used by the page's loading skeletons, so they take the grid's exact shape.
export function TileGrid({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="tile-grid"
      className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-x-5 gap-y-7 phone:grid-cols-2 phone:gap-x-3 phone:gap-y-5"
    >
      {children}
    </div>
  )
}

// A group's indented body with its 2px category line. `lineless` keeps only the indent, for
// placeholders that must line up with a group's content without belonging to one.
export function GroupIndent({ lineless = false, children }: { lineless?: boolean; children: ReactNode }) {
  return (
    // line nudged right (ml-[7px]) so the 2px rule centres under the chevron's bottom tip
    <div className={`ml-[7px] border-l-2 pl-4 ${lineless ? 'border-transparent' : 'border-cat-line'}`}>{children}</div>
  )
}

function Rows({
  recipes,
  detail,
  allCategories,
  showImages,
  exceptCategoryId = null,
}: RowOptions & { recipes: Recipe[]; exceptCategoryId?: UserCategoryId | null }) {
  if (detail === 'tiles') {
    return (
      <TileGrid>
        {recipes.map((r) => (
          <RecipeTile key={r.id} recipe={r} categories={recipeCategories(r, allCategories, exceptCategoryId)} />
        ))}
      </TileGrid>
    )
  }

  const compact = detail === 'compact'
  // Compact rows sit close together as one list; detailed rows are spaced cards.
  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-2'}>
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
      {/* A real (postxl) Button as the trigger — Button asChild merges onto the
          Radix trigger (which forwards refs), so we get button semantics +
          cursor-pointer without changing the heading's look. Sticky so the category
          stays labelled while scrolling; top clears the site header. Solid (not
          frosted): two stacked backdrop-blurs would seam against the page header. */}
      <Button
        asChild
        variant="ghost"
        className="sticky top-[var(--list-sticky-top,var(--site-nav-h))] z-20 mb-2 h-auto w-full justify-start gap-2 rounded-none bg-background px-0 py-1.5 text-lg font-semibold hover:bg-background dark:hover:bg-background has-[>svg]:px-0 text-cat-ink hover:text-cat-ink"
      >
        <CollapseTrigger>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]/cat:-rotate-90" />
          <span className="min-w-0 truncate">{name}</span>
          <span className="tabular-nums text-sm font-normal text-muted-foreground">{recipes.length}</span>
        </CollapseTrigger>
      </Button>
      <CollapseContent>
        <GroupIndent>
          <Rows recipes={recipes} exceptCategoryId={categoryId} {...rowOptions} />
        </GroupIndent>
      </CollapseContent>
    </Collapse>
  )
}

// Collapse is controlled by the page (so the toolbar's collapse-all shares the
// state). `collapsed` holds the keys that are closed; empty = all open.
// `categories` drive the grouping and may be narrowed by the category filter;
// `allCategories` (unfiltered) feed the rows' dots so a filter never hides them.
// `showImages` is decided by the page from all loaded recipes.
export function RecipeListView({
  recipes,
  categories,
  allCategories = categories,
  showImages = false,
  detail,
  grouped = true,
  collapsed = NONE_COLLAPSED,
  onCollapsedChange,
}: {
  recipes: Recipe[]
  categories: UserCategory[]
  allCategories?: UserCategory[]
  showImages?: boolean
  detail: DetailView
  grouped?: boolean
  collapsed?: ReadonlySet<string>
  onCollapsedChange?: (next: Set<string>) => void
}) {
  const rowOptions: RowOptions = { detail, allCategories, showImages }

  // Flat list: one sorted sequence (or one grid), no category headers or collapse.
  if (!grouped) return <Rows recipes={recipes} {...rowOptions} />

  const groups = deriveGroups(recipes, categories)

  const setOpen = (key: string, open: boolean) => {
    if (!onCollapsedChange) return
    const next = new Set(collapsed)
    if (open) next.delete(key)
    else next.add(key)
    onCollapsedChange(next)
  }

  return (
    <div className="space-y-6">
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
