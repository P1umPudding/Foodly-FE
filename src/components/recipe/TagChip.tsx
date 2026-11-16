import { TagIcon } from '../TagText'
import { useTagIcon } from '../../hooks/useTagIcon'
import type { Tag } from '../../api/protocol'

// A tag as a grey chip, 22 px high as in the mockup (.tag): its own icon in front only once it has loaded (no slot
// while loading or after a failure, so no stray gap), the name always visible, so the icon is decorative (alt="").
// A long name truncates rather than push the row or the phone screen apart; `capped` (list rows) narrows it further.
export function TagChip({ name, tag, capped = false }: { name: string; tag?: Tag; capped?: boolean }) {
  return (
    <span
      className={`inline-flex h-[22px] min-w-0 items-center gap-1 whitespace-nowrap rounded-sm bg-tag px-2 text-xs font-medium text-muted-foreground ${capped ? 'max-w-40' : 'max-w-full'}`}
    >
      {tag && <ChipIcon tag={tag} />}
      <span className="truncate">{name}</span>
    </span>
  )
}

function ChipIcon({ tag }: { tag: Tag }) {
  if (!useTagIcon(tag)) return null
  return (
    <span className="inline-flex shrink-0">
      <TagIcon tag={tag} alt="" size="xs" />
    </span>
  )
}
