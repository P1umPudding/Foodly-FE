import { RecipeRow } from '../recipe/RecipeRow'
import type { Recipe, UserCategory } from '../../api/protocol'
import type { GroupView, DetailView } from '../../list/state'

function Rows({ recipes, compact }: { recipes: Recipe[]; compact: boolean }) {
  return (
    <div className="space-y-3">
      {recipes.map((r) => (
        <RecipeRow key={r.id} recipe={r} compact={compact} />
      ))}
    </div>
  )
}

export function RecipeListView({
  recipes,
  categories,
  group,
  detail,
}: {
  recipes: Recipe[]
  categories: UserCategory[]
  group: GroupView
  detail: DetailView
}) {
  const compact = detail === 'compact'

  if (group === 'flat') return <Rows recipes={recipes} compact={compact} />

  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const inAnyCategory = new Set<number>()
  for (const c of categories) for (const id of c.recipes) inAnyCategory.add(id)
  const uncategorised = recipes.filter((r) => !inAnyCategory.has(r.id))

  return (
    <div className="space-y-6">
      {ordered.map((c) => {
        const inThis = recipes.filter((r) => c.recipes.includes(r.id))
        if (inThis.length === 0) return null
        return (
          <section key={c.id}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">{c.name}</h3>
            <Rows recipes={inThis} compact={compact} />
          </section>
        )
      })}
      {uncategorised.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Ohne Kategorie</h3>
          <Rows recipes={uncategorised} compact={compact} />
        </section>
      )}
    </div>
  )
}
