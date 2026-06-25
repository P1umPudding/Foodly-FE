import { useState } from 'react';
import { Input, Badge, ToggleGroup, ToggleGroupItem } from '@postxl/ui-components';
import { Crown, Pencil, Eye, Lock, Share2, Users } from 'lucide-react';
import type { ListState, RoleFilter, CollabFilter } from '../../list/state';
import { normalizeText } from '../../list/search';
import type { Tag, Ingredient } from '../../api/protocol';

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function FilterControls({
  state, set, tags, ingredients,
}: {
  state: ListState; set: (patch: Partial<ListState>) => void;
  tags: Tag[]; ingredients: Ingredient[];
}) {
  const [ingredientQuery, setIngredientQuery] = useState('');

  const filteredIngredients = ingredientQuery.trim() === ''
    ? ingredients
    : ingredients.filter((i) => normalizeText(i.name).includes(normalizeText(ingredientQuery)));

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Rezepte suchen…"
        value={state.search}
        onChange={(e) => set({ search: e.target.value })}
      />

      {/* Tags (AND) */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge
              key={t.id}
              variant={state.tags.includes(t.id) ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => set({ tags: toggle(state.tags, t.id) })}
            >{t.id}</Badge>
          ))}
        </div>
      )}

      {/* Ingredients (AND) — inline searchable list */}
      {ingredients.length > 0 && (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Zutat suchen…"
            value={ingredientQuery}
            onChange={(e) => setIngredientQuery(e.target.value)}
          />
          <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
            {filteredIngredients.map((i) => (
              <Badge
                key={i.id}
                variant={state.ingredients.includes(i.id) ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => set({ ingredients: toggle(state.ingredients, i.id) })}
              >{i.name}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Duration max — "≤" prefix makes the predicate (workMinutes/overallMinutes ≤ durationMax) explicit;
          the inline segmented switch picks which time field the threshold applies to. */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">≤</span>
        <Input
          type="number"
          className="w-20"
          placeholder="Min."
          value={state.durationMax ?? ''}
          onChange={(e) => set({ durationMax: e.target.value === '' ? null : Number(e.target.value) })}
        />
        <ToggleGroup
          type="single"
          value={state.durationField}
          onValueChange={(v) => v && set({ durationField: v as 'work' | 'overall' })}
        >
          <ToggleGroupItem
            value="work"
            className="px-2 text-xs data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
          >Arbeitszeit</ToggleGroupItem>
          <ToggleGroupItem
            value="overall"
            className="px-2 text-xs data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
          >Gesamtzeit</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Role and collaboration segmented toggles — deselecting all resets to 'any' */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Rolle</span>
        <ToggleGroup
          type="single"
          className="w-full"
          value={state.role === 'any' ? '' : state.role}
          onValueChange={(v) => set({ role: (v || 'any') as RoleFilter })}
        >
          <ToggleGroupItem
            value="owner"
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
          >
            <Crown className="size-5" />Besitzer
          </ToggleGroupItem>
          <ToggleGroupItem
            value="editor"
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
          >
            <Pencil className="size-5" />Bearbeiter
          </ToggleGroupItem>
          <ToggleGroupItem
            value="viewer"
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
          >
            <Eye className="size-5" />Betrachter
          </ToggleGroupItem>
        </ToggleGroup>

        <span className="text-xs font-medium text-muted-foreground">Freigabe</span>
        <ToggleGroup
          type="single"
          className="w-full"
          value={state.collab === 'any' ? '' : state.collab}
          onValueChange={(v) => set({ collab: (v || 'any') as CollabFilter })}
        >
          <ToggleGroupItem
            value="private"
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
          >
            <Lock className="size-5" />Privat
          </ToggleGroupItem>
          <ToggleGroupItem
            value="shared"
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-[#0ea5e9]/15 data-[state=on]:text-foreground"
          >
            <Share2 className="size-5" />Geteilt
          </ToggleGroupItem>
          <ToggleGroupItem
            value="collaborative"
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-[#10b981]/15 data-[state=on]:text-foreground"
          >
            <Users className="size-5" />Kollaborativ
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
