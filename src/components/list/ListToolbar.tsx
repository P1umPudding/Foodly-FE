// Toolbar rendered next to the "Rezepte" heading: sort dropdown + icon-based view-mode toggles.
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  ToggleGroup, ToggleGroupItem,
} from '@postxl/ui-components';
import { Rows3, Rows4, List, FolderTree } from 'lucide-react';
import type { ListState, SortKey, DetailView, GroupView } from '../../list/state';

// One combined dropdown entry per (sort key × direction); value is `${key}|${dir}`.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name|asc', label: 'Name (A–Z)' },
  { value: 'name|desc', label: 'Name (Z–A)' },
  { value: 'work|asc', label: 'Arbeitszeit (kurz zuerst)' },
  { value: 'work|desc', label: 'Arbeitszeit (lang zuerst)' },
  { value: 'overall|asc', label: 'Gesamtzeit (kurz zuerst)' },
  { value: 'overall|desc', label: 'Gesamtzeit (lang zuerst)' },
  { value: 'rating|desc', label: 'Bewertung (beste zuerst)' },
  { value: 'rating|asc', label: 'Bewertung (schlechteste zuerst)' },
];

export function ListToolbar({
  state, set,
}: {
  state: ListState;
  set: (patch: Partial<ListState>) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* Sort dropdown */}
      <Select
        value={`${state.sortKey}|${state.sortDir}`}
        onValueChange={(v) => {
          const [key, dir] = v.split('|') as [SortKey, 'asc' | 'desc'];
          set({ sortKey: key, sortDir: dir });
        }}
      >
        <SelectTrigger className="w-48 justify-between text-sm [&>span]:text-left"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Detail view: Detailed vs Compact */}
      <ToggleGroup
        type="single"
        value={state.detail}
        onValueChange={(v) => v && set({ detail: v as DetailView })}
      >
        <ToggleGroupItem value="detailed" aria-label="Detailliert" title="Detailliert">
          <Rows3 className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="compact" aria-label="Kompakt" title="Kompakt">
          <Rows4 className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Group view: Flat list vs By category */}
      <ToggleGroup
        type="single"
        value={state.group}
        onValueChange={(v) => v && set({ group: v as GroupView })}
      >
        <ToggleGroupItem value="flat" aria-label="Flache Liste" title="Flache Liste">
          <List className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="by-category" aria-label="Nach Kategorie" title="Nach Kategorie">
          <FolderTree className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
