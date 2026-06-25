import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@postxl/ui-components';
import { useTags } from '../../catalog/CatalogProvider';
import { TagIcon } from '../TagText';
import type { TagId } from '../../api/protocol';

// recipe.tags are bare ids (= names). Render each either/or: icon when the tag
// has one, otherwise the name — no surrounding chip box. With `hoverName` (detail
// view) an icon tag reveals its name on hover. `size` lifts the detail row.
export function TagChips({
  tags,
  hoverName = false,
  size = 'sm',
}: {
  tags: TagId[];
  hoverName?: boolean;
  size?: 'sm' | 'lg';
}) {
  const { byId } = useTags();
  if (tags.length === 0) return null;

  const items = tags.map((t) => {
    const svg = byId[t]?.svg ?? null;
    if (!svg) {
      return <span key={t} className="text-foreground/75">{t}</span>;
    }
    const icon = <TagIcon hash={svg} alt={t} size={size === 'lg' ? 'md' : 'sm'} />;
    if (!hoverName) return <span key={t} className="inline-flex">{icon}</span>;
    return (
      <Tooltip key={t}>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">{icon}</span>
        </TooltipTrigger>
        <TooltipContent>{t}</TooltipContent>
      </Tooltip>
    );
  });

  const row = (
    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
      {items}
    </div>
  );
  return hoverName ? <TooltipProvider delayDuration={150}>{row}</TooltipProvider> : row;
}
