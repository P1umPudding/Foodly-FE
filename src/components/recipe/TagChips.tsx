import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@postxl/ui-components'
import { useTags } from '../../catalog/CatalogProvider'
import { TagIcon } from '../TagText'
import { useTagIcon } from '../../hooks/useTagIcon'
import type { Tag, TagId } from '../../api/protocol'

// recipe.tags are bare ids (= names). Render each either/or: icon when the tag
// has one, otherwise the name — no surrounding chip box. With `hoverName` (detail
// view) an icon tag reveals its name on hover. `size` lifts the detail row.
export function TagChips({
  tags,
  hoverName = false,
  size = 'sm',
  align = 'start',
}: {
  tags: TagId[]
  hoverName?: boolean
  size?: 'sm' | 'lg'
  align?: 'start' | 'end'
}) {
  const { byId } = useTags()
  if (tags.length === 0) return null

  const items = tags.map((t) => {
    const tag = byId[t]
    return tag?.svg ? <IconChip key={t} tag={tag} hoverName={hoverName} size={size} /> : <TagName key={t} name={t} />
  })

  const row = (
    <div
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${align === 'end' ? 'justify-end' : ''} ${size === 'lg' ? 'text-lg' : 'text-sm'}`}
    >
      {items}
    </div>
  )
  return hoverName ? <TooltipProvider delayDuration={150}>{row}</TooltipProvider> : row
}

function TagName({ name }: { name: string }) {
  return <span className="text-foreground/75">{name}</span>
}

// While the icon loads (REST) or when it has none, the tag reads as its plain
// name, without a tooltip repeating that name.
function IconChip({ tag, hoverName, size }: { tag: Tag; hoverName: boolean; size: 'sm' | 'lg' }) {
  const src = useTagIcon(tag)
  if (!src) return <TagName name={tag.id} />
  const icon = (
    <TagIcon tag={tag} alt={tag.id} size={size === 'lg' ? 'md' : 'sm'} fallback={<TagName name={tag.id} />} />
  )
  if (!hoverName) return <span className="inline-flex">{icon}</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">{icon}</span>
      </TooltipTrigger>
      <TooltipContent>{tag.id}</TooltipContent>
    </Tooltip>
  )
}
