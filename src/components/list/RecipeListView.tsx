import { Collapse, CollapseContent, CollapseTrigger } from '@postxl/ui-components'
import { ChevronDown } from 'lucide-react'
import { RecipeRow } from '../recipe/RecipeRow'
import { colorClasses } from '../../list/palette'
import type { Recipe, UserCategory } from '../../api/protocol'
import type { DetailView } from '../../list/state'

function Rows({ recipes, compact }: { recipes: Recipe[]; compact: boolean }) {
  return (
    <div className="space-y-3">
      {recipes.map((r) => (
        <RecipeRow key={r.id} recipe={r} compact={compact} />
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
}: {
  name: string
  color: string
  recipes: Recipe[]
  compact: boolean
}) {
  const c = colorClasses(color)
  return (
    <Collapse defaultOpen className="group/cat">
      <CollapseTrigger className={`mb-2 flex w-full items-center gap-2 text-lg font-semibold ${c.text}`}>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]/cat:-rotate-90" />
        <span className="min-w-0 truncate">{name}</span>
        <span className="tabular-nums text-sm font-normal text-muted-foreground">{recipes.length}</span>
      </CollapseTrigger>
      <CollapseContent>
        {/* line nudged right (ml-[7px]) so the 2px rule centres under the chevron's bottom tip */}
        <div className={`ml-[7px] border-l-2 pl-4 ${c.line}`}>
          <Rows recipes={recipes} compact={compact} />
        </div>
      </CollapseContent>
    </Collapse>
  )
}

export function RecipeListView({
  recipes,
  categories,
  detail,
}: {
  recipes: Recipe[]
  categories: UserCategory[]
  detail: DetailView
}) {
  const compact = detail === 'compact'
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const inAnyCategory = new Set<number>()
  for (const c of categories) for (const id of c.recipes) inAnyCategory.add(id)
  const uncategorised = recipes.filter((r) => !inAnyCategory.has(r.id))

  return (
    <div className="space-y-6">
      {ordered.map((c) => {
        const inThis = recipes.filter((r) => c.recipes.includes(r.id))
        if (inThis.length === 0) return null
        return <CategoryGroup key={c.id} name={c.name} color={c.color} recipes={inThis} compact={compact} />
      })}
      {uncategorised.length > 0 && (
        <CategoryGroup name="Ohne Kategorie" color="" recipes={uncategorised} compact={compact} />
      )}
    </div>
  )
}
