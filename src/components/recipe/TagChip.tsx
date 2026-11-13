import { TagIcon } from '../TagText'
import type { Tag } from '../../api/protocol'

// A tag as a grey chip: its own icon in front only when the tag has one and it loads (no placeholder otherwise),
// the name always visible, so the icon is decorative (alt="").
export function TagChip({ name, tag }: { name: string; tag?: Tag }) {
  return (
    <span className="inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-sm bg-tag px-2 text-xs font-medium text-muted-foreground">
      {tag?.svg && <TagIcon tag={tag} alt="" size="xs" />}
      {name}
    </span>
  )
}
