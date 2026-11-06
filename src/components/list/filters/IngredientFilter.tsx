import { useState } from 'react'
import { normalizeText } from '../../../list/search'
import type { ListState } from '../../../list/state'
import type { Ingredient } from '../../../api/protocol'
import { SearchInput } from '../SearchInput'
import { FilterCheckRow, NoMatches } from './FilterCheckRow'
import { toggle } from './toggle'

// Without a query only this many unselected ingredients show; the catalogue is too long to scan.
const PREVIEW_COUNT = 12

// Multi-select (AND). Selected ingredients always sit on top; no match counts (server-side, paged list).
export function IngredientFilter({
  ingredients,
  selected,
  set,
}: {
  ingredients: Ingredient[]
  selected: number[]
  set: (patch: Partial<ListState>) => void
}) {
  const [query, setQuery] = useState('')
  const q = normalizeText(query.trim())
  // The search narrows selected items too (as before); they stay on top among the matches.
  const sorted = [...ingredients].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const matches = q === '' ? sorted : sorted.filter((i) => normalizeText(i.name).includes(q))
  const picked = matches.filter((i) => selected.includes(i.id))
  const rest = matches.filter((i) => !selected.includes(i.id))
  const shownRest = q === '' ? rest.slice(0, PREVIEW_COUNT) : rest
  const ordered = [...picked, ...shownRest]
  return (
    <div className="flex flex-col gap-2">
      <SearchInput value={query} onChange={setQuery} placeholder="Zutat suchen…" />
      {ordered.length === 0 ? (
        <NoMatches />
      ) : (
        <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {ordered.map((i) => (
            <FilterCheckRow
              key={i.id}
              checked={selected.includes(i.id)}
              onToggle={() => set({ ingredients: toggle(selected, i.id) })}
            >
              <span className="truncate">{i.name}</span>
            </FilterCheckRow>
          ))}
        </div>
      )}
      {shownRest.length < rest.length && <p className="px-1 text-sm text-muted-foreground">Weitere über die Suche</p>}
    </div>
  )
}
