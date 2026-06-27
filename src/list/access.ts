import type { RoleFilter, CollabFilter } from './state'

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
