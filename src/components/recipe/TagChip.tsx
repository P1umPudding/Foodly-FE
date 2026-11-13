import { TagIcon } from '../TagText'
import type { Tag } from '../../api/protocol'

// A tag as a grey chip: its own icon in front only when the tag has one and it loads (no placeholder otherwise),
// the name always visible, so the icon is decorative (alt="").
// 22 px high as in the mockup (.tag). A long name truncates rather than push the row or the phone screen apart.
export function TagChip({ name, tag }: { name: string; tag?: Tag }) {
  return (
    <span className="inline-flex h-[22px] min-w-0 max-w-40 items-center gap-1 whitespace-nowrap rounded-sm bg-tag px-2 text-xs font-medium text-muted-foreground">
      {tag?.svg && (
        <span className="inline-flex shrink-0">
          <TagIcon tag={tag} alt="" size="xs" />
        </span>
      )}
      <span className="truncate">{name}</span>
    </span>
  )
}
