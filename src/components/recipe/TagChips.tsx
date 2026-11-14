import { useTags } from '../../catalog/CatalogProvider'
import { TagChip } from './TagChip'
import type { TagId } from '../../api/protocol'

// recipe.tags are bare ids (= names). Every tag reads as a chip with its name (designer review 13.11.: the earlier
// icon-or-name rule hid names behind icons). `max` caps the list rows at the mockup's two narrower chips.
export function TagChips({ tags, max, align = 'start' }: { tags: TagId[]; max?: number; align?: 'start' | 'end' }) {
  const { byId } = useTags()
  if (tags.length === 0) return null
  return (
    <div className={`flex flex-wrap items-center gap-1 ${align === 'end' ? 'justify-end' : ''}`}>
      {tags.slice(0, max).map((t) => (
        <TagChip key={t} name={t} tag={byId[t]} capped={max !== undefined} />
      ))}
    </div>
  )
}
