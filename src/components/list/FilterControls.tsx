import { Fragment } from 'react';
import { Input, Button, Badge } from '@postxl/ui-components';
import type { ListState, RoleFilter, CollabFilter, SortKey } from '../../list/state';
import { roleCellKey } from '../../list/counts';
import type { Tag, Ingredient } from '../../api/protocol';

const ROLES: Exclude<RoleFilter, 'any'>[] = ['owner', 'editor', 'viewer'];
const COLLABS: Exclude<CollabFilter, 'any'>[] = ['private', 'shared', 'collaborative'];
const ROLE_LABEL: Record<Exclude<RoleFilter, 'any'>, string> = { owner: 'Besitzer', editor: 'Bearbeiter', viewer: 'Betrachter' };
const COLLAB_LABEL: Record<Exclude<CollabFilter, 'any'>, string> = { private: 'privat', shared: 'geteilt', collaborative: 'kollaborativ' };

// editor ⇒ collaborative; viewer ⇒ shared|collaborative. Everything else with owner is valid.
function cellValid(role: Exclude<RoleFilter, 'any'>, collab: Exclude<CollabFilter, 'any'>): boolean {
  if (role === 'editor') return collab === 'collaborative';
  if (role === 'viewer') return collab !== 'private';
  return true; // owner: all three valid
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' }, { key: 'work', label: 'Arbeitszeit' },
  { key: 'overall', label: 'Gesamtzeit' }, { key: 'rating', label: 'Bewertung' },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function FilterControls({
  state, set, tags, ingredients, gridCounts,
}: {
  state: ListState; set: (patch: Partial<ListState>) => void;
  tags: Tag[]; ingredients: Ingredient[]; gridCounts: Record<string, number>;
}) {
  // Last-click-wins relax: clicking a cell sets both axes; if invalid, the sister axis relaxes to 'any'.
  const clickCell = (role: Exclude<RoleFilter, 'any'>, collab: Exclude<CollabFilter, 'any'>) => {
    if (cellValid(role, collab)) set({ role, collab });
    else if (role === 'editor' || role === 'viewer') set({ role: 'any', collab }); // role forced the conflict
    else set({ role, collab: 'any' });
  };

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

      {/* Ingredients (AND) */}
      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ingredients.map((i) => (
            <Badge
              key={i.id}
              variant={state.ingredients.includes(i.id) ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => set({ ingredients: toggle(state.ingredients, i.id) })}
            >{i.name}</Badge>
          ))}
        </div>
      )}

      {/* Duration max */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className="w-24"
          placeholder="Minuten"
          value={state.durationMax ?? ''}
          onChange={(e) => set({ durationMax: e.target.value === '' ? null : Number(e.target.value) })}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => set({ durationField: state.durationField === 'work' ? 'overall' : 'work' })}
        >{state.durationField === 'work' ? 'Arbeitszeit' : 'Gesamtzeit'}</Button>
      </div>

      {/* Role × Collaboration grid */}
      <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1 text-xs">
        <span />
        {COLLABS.map((c) => <span key={c} className="px-1 text-center text-muted-foreground">{COLLAB_LABEL[c]}</span>)}
        {ROLES.map((role) => (
          <Fragment key={role}>
            <span className="px-1 text-muted-foreground">{ROLE_LABEL[role]}</span>
            {COLLABS.map((collab) => {
              const valid = cellValid(role, collab);
              const active = state.role === role && state.collab === collab;
              const count = gridCounts[roleCellKey(role, collab)] ?? 0;
              return (
                <Button
                  key={collab}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  aria-label={`${ROLE_LABEL[role]} ${COLLAB_LABEL[collab]}`}
                  className={valid ? '' : 'opacity-40'}
                  onClick={() => clickCell(role, collab)}
                >{valid ? count : '—'}</Button>
              );
            })}
          </Fragment>
        ))}
      </div>
      {(state.role !== 'any' || state.collab !== 'any') && (
        <Button variant="ghost" size="sm" onClick={() => set({ role: 'any', collab: 'any' })}>Rolle zurücksetzen</Button>
      )}

      {/* Sort */}
      <div className="flex flex-wrap items-center gap-1">
        {SORTS.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={state.sortKey === s.key ? 'default' : 'outline'}
            onClick={() => set(state.sortKey === s.key
              ? { sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' }
              : { sortKey: s.key })}
          >{s.label}{state.sortKey === s.key ? (state.sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</Button>
        ))}
      </div>

      {/* View toggles */}
      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant={state.detail === 'compact' ? 'default' : 'outline'}
          onClick={() => set({ detail: state.detail === 'detailed' ? 'compact' : 'detailed' })}>
          {state.detail === 'compact' ? 'Kompakt' : 'Detailliert'}
        </Button>
        <Button size="sm" variant={state.group === 'by-category' ? 'default' : 'outline'}
          onClick={() => set({ group: state.group === 'flat' ? 'by-category' : 'flat' })}>
          {state.group === 'by-category' ? 'Nach Kategorie' : 'Flache Liste'}
        </Button>
      </div>
    </div>
  );
}
