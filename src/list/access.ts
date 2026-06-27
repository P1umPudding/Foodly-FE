import type { Role, Collaboration } from '../api/views'
import type { RoleFilter, CollabFilter } from './state'

// Access (role/Freigabe) colour is the *muted* axis — category colour is the loud
// one. These hues are deliberately desaturated and chosen to never collide with a
// category hex (#e11d48 / #0ea5e9 / #f59e0b / #10b981). Colour never carries meaning
// alone — the icon shape and the aria-label do. `icon` is the muted text colour; the
// row indicator (RoleCollabIndicator) shows it only when that value is the active filter.
type AccessColor = { icon: string }

export const ROLE_COLOR: Record<Role, AccessColor> = {
  owner: { icon: 'text-[#a07b3f]' },
  editor: { icon: 'text-[#7b6ca6]' },
  viewer: { icon: 'text-[#6b7280]' },
  other: { icon: 'text-muted-foreground' },
}

export const COLLAB_COLOR: Record<Collaboration, AccessColor> = {
  private: { icon: 'text-[#6b7280]' },
  shared: { icon: 'text-[#5f7f9c]' },
  collaborative: { icon: 'text-[#5a9183]' },
}

// §D validity matrix: my role can force the sharing state. Only these 6 of 9
// (role × collaboration) combinations are logically possible.
const VALID = new Set<string>([
  'owner|private',
  'owner|shared',
  'owner|collaborative',
  'editor|collaborative',
  'viewer|shared',
  'viewer|collaborative',
])

export function roleAllowsCollab(role: RoleFilter, collab: CollabFilter): boolean {
  if (role === 'any' || collab === 'any') return true
  return VALID.has(`${role}|${collab}`)
}

// A collab option is greyed when a concrete role is selected that can never pair
// with it. (And symmetrically for role options.) "any" on the sister axis greys
// nothing.
export function collabDisabled(collab: Exclude<CollabFilter, 'any'>, selectedRole: RoleFilter): boolean {
  return selectedRole !== 'any' && !roleAllowsCollab(selectedRole, collab)
}

export function roleDisabled(role: Exclude<RoleFilter, 'any'>, selectedCollab: CollabFilter): boolean {
  return selectedCollab !== 'any' && !roleAllowsCollab(role, selectedCollab)
}
