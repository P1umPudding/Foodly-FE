import {
  DEFAULT_STATE, type ListState, type RoleFilter, type CollabFilter,
  type SortKey, type SortDir, type DetailView, type GroupView,
} from './state';

const ROLES: RoleFilter[] = ['any', 'owner', 'editor', 'viewer'];
const COLLABS: CollabFilter[] = ['any', 'private', 'shared', 'collaborative'];
const SORTS: SortKey[] = ['name', 'work', 'overall', 'rating'];
const DIRS: SortDir[] = ['asc', 'desc'];
const DETAILS: DetailView[] = ['detailed', 'compact'];
const GROUPS: GroupView[] = ['flat', 'by-category'];

const oneOf = <T extends string>(allowed: T[], raw: string | null, fallback: T): T =>
  (raw && (allowed as string[]).includes(raw) ? (raw as T) : fallback);

const nums = (params: URLSearchParams, key: string): number[] =>
  params.getAll(key).map(Number).filter((n) => Number.isInteger(n));

export function toSearchParams(state: ListState): URLSearchParams {
  const p = new URLSearchParams();
  for (const c of state.categories) p.append('cat', String(c));
  for (const t of state.tags) p.append('tag', t);
  for (const i of state.ingredients) p.append('ing', String(i));
  if (state.durationMax !== null) p.set('dmax', String(state.durationMax));
  if (state.durationField !== DEFAULT_STATE.durationField) p.set('dfield', state.durationField);
  if (state.role !== DEFAULT_STATE.role) p.set('role', state.role);
  if (state.collab !== DEFAULT_STATE.collab) p.set('collab', state.collab);
  if (state.search.trim() !== '') p.set('q', state.search);
  if (state.sortKey !== DEFAULT_STATE.sortKey) p.set('sort', state.sortKey);
  if (state.sortDir !== DEFAULT_STATE.sortDir) p.set('dir', state.sortDir);
  if (state.detail !== DEFAULT_STATE.detail) p.set('view', state.detail);
  if (state.group !== DEFAULT_STATE.group) p.set('group', state.group);
  return p;
}

export function fromSearchParams(p: URLSearchParams): ListState {
  const dmaxRaw = p.get('dmax');
  const dmax = dmaxRaw !== null && Number.isFinite(Number(dmaxRaw)) ? Number(dmaxRaw) : null;
  return {
    categories: nums(p, 'cat'),
    tags: p.getAll('tag'),
    ingredients: nums(p, 'ing'),
    durationMax: dmax,
    durationField: oneOf(['work', 'overall'], p.get('dfield'), DEFAULT_STATE.durationField),
    role: oneOf(ROLES, p.get('role'), DEFAULT_STATE.role),
    collab: oneOf(COLLABS, p.get('collab'), DEFAULT_STATE.collab),
    search: p.get('q') ?? '',
    sortKey: oneOf(SORTS, p.get('sort'), DEFAULT_STATE.sortKey),
    sortDir: oneOf(DIRS, p.get('dir'), DEFAULT_STATE.sortDir),
    detail: oneOf(DETAILS, p.get('view'), DEFAULT_STATE.detail),
    group: oneOf(GROUPS, p.get('group'), DEFAULT_STATE.group),
  };
}
