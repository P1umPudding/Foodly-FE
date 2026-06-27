import {
  DEFAULT_STATE,
  type ListState,
  type RoleFilter,
  type CollabFilter,
  type SortKey,
  type SortDir,
  type DetailView,
} from './state'

const ROLES: RoleFilter[] = ['any', 'owner', 'editor', 'viewer']
const COLLABS: CollabFilter[] = ['any', 'private', 'shared', 'collaborative']
const SORTS: SortKey[] = ['name', 'work', 'overall', 'rating']
const DIRS: SortDir[] = ['asc', 'desc']
const DETAILS: DetailView[] = ['detailed', 'compact']

const oneOf = <T extends string>(allowed: T[], raw: string | null, fallback: T): T =>
  raw && (allowed as string[]).includes(raw) ? (raw as T) : fallback

const nums = (params: URLSearchParams, key: string): number[] =>
  params
    .getAll(key)
    .map(Number)
    .filter((n) => Number.isInteger(n))

export function toSearchParams(state: ListState): URLSearchParams {
  const p = new URLSearchParams()
  for (const c of state.categories) p.append('cat', String(c))
  for (const t of state.tags) p.append('tag', t)
  for (const i of state.ingredients) p.append('ing', String(i))
  if (state.durationMax !== null) p.set('dmax', String(state.durationMax))
  if (state.role !== DEFAULT_STATE.role) p.set('role', state.role)
  if (state.collab !== DEFAULT_STATE.collab) p.set('collab', state.collab)
  if (state.search.trim() !== '') p.set('q', state.search)
  if (state.sortKey !== DEFAULT_STATE.sortKey) p.set('sort', state.sortKey)
  if (state.sortDir !== DEFAULT_STATE.sortDir) p.set('dir', state.sortDir)
  if (state.detail !== DEFAULT_STATE.detail) p.set('view', state.detail)
  if (state.grouped !== DEFAULT_STATE.grouped) p.set('group', state.grouped ? '1' : '0')
  return p
}

export function fromSearchParams(p: URLSearchParams): ListState {
  const dmaxRaw = p.get('dmax')
  const dmax = dmaxRaw !== null && Number.isFinite(Number(dmaxRaw)) ? Number(dmaxRaw) : null
  return {
    categories: nums(p, 'cat'),
    tags: p.getAll('tag'),
    ingredients: nums(p, 'ing'),
    durationMax: dmax,
    role: oneOf(ROLES, p.get('role'), DEFAULT_STATE.role),
    collab: oneOf(COLLABS, p.get('collab'), DEFAULT_STATE.collab),
    search: p.get('q') ?? '',
    sortKey: oneOf(SORTS, p.get('sort'), DEFAULT_STATE.sortKey),
    sortDir: oneOf(DIRS, p.get('dir'), DEFAULT_STATE.sortDir),
    detail: oneOf(DETAILS, p.get('view'), DEFAULT_STATE.detail),
    // absent → default (true); explicit '0' → flat list.
    grouped: p.has('group') ? p.get('group') !== '0' : DEFAULT_STATE.grouped,
  }
}
