import { useState } from 'react'
import { normalizeText } from '../../../list/search'
import type { ListState } from '../../../list/state'
import type { Tag } from '../../../api/protocol'
import { SearchInput } from '../SearchInput'
import { TagIcon } from '../../TagText'
import { FilterCheckRow, FilterHint, NoMatches } from './FilterCheckRow'
import { selectedThenCapped, useOrderAtOpen } from './optionOrder'
import { toggle } from './toggle'

const MAX_TAGS = 40

// Multi-select (AND). No match counts: the list is filtered server-side and loads page by page. `tags` come most
// used first.
export function TagFilter({
  tags,
  selected,
  set,
}: {
  tags: Tag[]
  selected: string[]
  set: (patch: Partial<ListState>) => void
}) {
  const [query, setQuery] = useState('')
  const q = normalizeText(query.trim())
  const ordered = useOrderAtOpen(tags, (t) => t.id)
  // The search narrows selected items too (as before); they stay on top among the matches.
  // Tags have no display name; the id is what the user sees and searches.
  const matches = q === '' ? ordered : ordered.filter((t) => normalizeText(t.id).includes(q))
  const rows = selectedThenCapped(matches, (t) => selected.includes(t.id), q === '' ? MAX_TAGS : null)
  return (
    <div className="flex flex-col">
      <SearchInput value={query} onChange={setQuery} placeholder="Tag suchen" className="mb-1.5" />
      {rows.length === 0 ? (
        <NoMatches />
      ) : (
        <div className="flex max-h-[264px] flex-col overflow-y-auto phone:max-h-[50vh]">
          {rows.map((t) => (
            <FilterCheckRow
              key={t.id}
              look="filter"
              checked={selected.includes(t.id)}
              onToggle={() => set({ tags: toggle(selected, t.id) })}
            >
              {t.svg && <TagIcon tag={t} alt="" size="sm" />}
              <span className="truncate">{t.id}</span>
            </FilterCheckRow>
          ))}
        </div>
      )}
      <FilterHint>Mehrere = Rezept hat alle.</FilterHint>
    </div>
  )
}
