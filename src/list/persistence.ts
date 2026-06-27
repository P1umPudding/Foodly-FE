import type { UserId } from '../api/protocol'
import type { ListState } from './state'

const VERSION = 1
const keyFor = (userId: UserId | null) => `foodly:list-state:${userId ?? 'anon'}`

// search is deliberately never persisted (it starts empty on each open).
type Persisted = Omit<ListState, 'search'>

export function loadPersisted(userId: UserId | null): Partial<ListState> | null {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { version?: number; state?: Persisted }
    if (parsed.version !== VERSION || !parsed.state) return null
    return parsed.state
  } catch {
    return null // corrupt/unavailable storage → fall back to defaults
  }
}

export function savePersisted(userId: UserId | null, state: ListState): void {
  try {
    const { search: _search, ...rest } = state
    localStorage.setItem(keyFor(userId), JSON.stringify({ version: VERSION, state: rest }))
  } catch {
    // storage full/blocked → silently skip; persistence is best-effort
  }
}

// Which category groups the user has collapsed (group keys, e.g. 'cat-3' / 'uncat').
// Separate from ListState: it's a personal UI preference, not part of the
// shareable URL. `null` = nothing stored yet (caller picks a default).
const collapseKeyFor = (userId: UserId | null) => `foodly:list-collapsed:${userId ?? 'anon'}`

export function loadCollapsed(userId: UserId | null): string[] | null {
  try {
    const raw = localStorage.getItem(collapseKeyFor(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : null
  } catch {
    return null
  }
}

export function saveCollapsed(userId: UserId | null, keys: Iterable<string>): void {
  try {
    localStorage.setItem(collapseKeyFor(userId), JSON.stringify([...keys]))
  } catch {
    // best-effort
  }
}
