import { useState } from 'react'
import { normalizeText } from '../../../list/search'
import type { ListState } from '../../../list/state'
import type { Ingredient } from '../../../api/protocol'
import { SearchInput } from '../SearchInput'
import { FilterCheckRow, FilterHint, NoMatches } from './FilterCheckRow'
import { selectedThenCapped, useOrderAtOpen } from './optionOrder'
import { toggle } from './toggle'

// Without a query only this many rows show (mockup); the catalogue is too long to scan, the rest is a search away.
const PREVIEW_COUNT = 9

// Multi-select (AND). Selected ingredients always sit on top; no match counts (server-side, paged list).
// `ingredients` come most used first.
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
  const ordered = useOrderAtOpen(ingredients, (i) => i.id)
  // The search narrows selected items too (as before); they stay on top among the matches.
  const matches = q === '' ? ordered : ordered.filter((i) => normalizeText(i.name).includes(q))
  const rows = selectedThenCapped(matches, (i) => selected.includes(i.id), q === '' ? PREVIEW_COUNT : null)
  return (
    <div className="flex flex-col">
      <SearchInput value={query} onChange={setQuery} placeholder="Zutat suchen" className="mb-1.5" />
      {rows.length === 0 ? (
        <NoMatches />
      ) : (
        <div className="flex max-h-[264px] flex-col overflow-y-auto phone:max-h-[50vh]">
          {rows.map((i) => (
            <FilterCheckRow
              key={i.id}
              look="filter"
              checked={selected.includes(i.id)}
              onToggle={() => set({ ingredients: toggle(selected, i.id) })}
            >
              <span className="truncate">{i.name}</span>
            </FilterCheckRow>
          ))}
        </div>
      )}
      <FilterHint>Alle weiteren über die Suche. Mehrere = Rezept enthält alle.</FilterHint>
    </div>
  )
}
