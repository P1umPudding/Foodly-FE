import { useState } from 'react'
import { normalizeText } from '../../../list/search'
import type { ListState } from '../../../list/state'
import type { Tag } from '../../../api/protocol'
import { SearchInput } from '../SearchInput'
import { TagIcon } from '../../TagText'
import { FilterCheckRow, NoMatches } from './FilterCheckRow'
import { toggle } from './toggle'

// Multi-select (AND). No match counts: the list is filtered server-side and loads page by page.
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
  // The search narrows selected items too (as before); they stay on top among the matches.
  // Tags have no display name; the id is what the user sees and searches.
  const matches = q === '' ? tags : tags.filter((t) => normalizeText(t.id).includes(q))
  const ordered = [
    ...matches.filter((t) => selected.includes(t.id)),
    ...matches.filter((t) => !selected.includes(t.id)),
  ]
  return (
    <div className="flex flex-col gap-2">
      <SearchInput value={query} onChange={setQuery} placeholder="Tag suchen…" />
      {ordered.length === 0 ? (
        <NoMatches />
      ) : (
        <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {ordered.map((t) => (
            <FilterCheckRow
              key={t.id}
              checked={selected.includes(t.id)}
              onToggle={() => set({ tags: toggle(selected, t.id) })}
            >
              {t.svg && <TagIcon tag={t} alt="" size="sm" />}
              <span className="truncate">{t.id}</span>
            </FilterCheckRow>
          ))}
        </div>
      )}
    </div>
  )
}
