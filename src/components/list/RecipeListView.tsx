import { Collapse, CollapseContent, CollapseTrigger } from '@postxl/ui-components'
import { ChevronDown } from 'lucide-react'
import { RecipeRow } from '../recipe/RecipeRow'
import { colorClasses } from '../../list/palette'
import { deriveGroups } from '../../list/grouping'
import type { Recipe, UserCategory } from '../../api/protocol'
import type { DetailView, RoleFilter, CollabFilter } from '../../list/state'

// The active role/Freigabe filters, forwarded to each row so a matching icon
// lights up in its access colour.
type AccessFilters = { activeRole: RoleFilter; activeCollab: CollabFilter }

const NONE_COLLAPSED: ReadonlySet<string> = new Set()

function Rows({ recipes, compact, access }: { recipes: Recipe[]; compact: boolean; access: AccessFilters }) {
  return (
    <div className="space-y-3">
      {recipes.map((r) => (
        <RecipeRow
          key={r.id}
          recipe={r}
          compact={compact}
          activeRole={access.activeRole}
          activeCollab={access.activeCollab}
        />
      ))}
    </div>
  )
}

// `color` null → neutral; uncategorised passes an empty string → neutral fallback.
function CategoryGroup({
  name,
  color,
  recipes,
  compact,
  access,
  open,
  onOpenChange,
}: {
  name: string
  color: string
  recipes: Recipe[]
  compact: boolean
  access: AccessFilters
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const c = colorClasses(color)
  return (
    <Collapse open={open} onOpenChange={onOpenChange} className="group/cat">
      {/* sticky so the category stays labelled while you scroll its recipes; top
          clears the sticky site header, bg keeps rows from showing through. */}
      <CollapseTrigger
        className={`sticky top-[3.75rem] z-20 mb-2 flex w-full items-center gap-2 bg-background py-1.5 text-lg font-semibold ${c.text}`}
      >
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]/cat:-rotate-90" />
        <span className="min-w-0 truncate">{name}</span>
        <span className="tabular-nums text-sm font-normal text-muted-foreground">{recipes.length}</span>
      </CollapseTrigger>
      <CollapseContent>
        {/* line nudged right (ml-[7px]) so the 2px rule centres under the chevron's bottom tip */}
        <div className={`ml-[7px] border-l-2 pl-4 ${c.line}`}>
          <Rows recipes={recipes} compact={compact} access={access} />
        </div>
      </CollapseContent>
    </Collapse>
  )
}

// Collapse is controlled by the page (so the toolbar's collapse-all shares the
// state). `collapsed` holds the keys that are closed; empty = all open.
export function RecipeListView({
  recipes,
  categories,
  detail,
  activeRole = 'any',
  activeCollab = 'any',
  collapsed = NONE_COLLAPSED,
  onCollapsedChange,
}: {
  recipes: Recipe[]
  categories: UserCategory[]
  detail: DetailView
  activeRole?: RoleFilter
  activeCollab?: CollabFilter
  collapsed?: ReadonlySet<string>
  onCollapsedChange?: (next: Set<string>) => void
}) {
  const compact = detail === 'compact'
  const access: AccessFilters = { activeRole, activeCollab }
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
          name={g.name}
          color={g.color}
          recipes={g.recipes}
          compact={compact}
          access={access}
          open={!collapsed.has(g.key)}
          onOpenChange={(o) => setOpen(g.key, o)}
        />
      ))}
    </div>
  )
}
