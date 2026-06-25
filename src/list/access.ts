import type { Role, Collaboration } from '../api/views'
import type { RoleFilter, CollabFilter } from './state'

// Colour reinforces the access type but never carries meaning alone — the icon
// and the aria-label do. One source for both the filter toggles and the row
// indicator. `activeBg` is the data-[state=on] tint used by ToggleGroupItem.
export const ROLE_COLOR: Record<Role, { icon: string; activeBg: string }> = {
  owner: { icon: 'text-[#f59e0b]', activeBg: 'data-[state=on]:bg-[#f59e0b]/15 data-[state=on]:text-foreground' },
  editor: { icon: 'text-[#8b5cf6]', activeBg: 'data-[state=on]:bg-[#8b5cf6]/15 data-[state=on]:text-foreground' },
  viewer: { icon: 'text-[#64748b]', activeBg: 'data-[state=on]:bg-[#64748b]/15 data-[state=on]:text-foreground' },
  other: { icon: 'text-muted-foreground', activeBg: '' },
}

export const COLLAB_COLOR: Record<Collaboration, { icon: string; activeBg: string }> = {
  private: { icon: 'text-[#64748b]', activeBg: 'data-[state=on]:bg-[#64748b]/15 data-[state=on]:text-foreground' },
  shared: { icon: 'text-[#0ea5e9]', activeBg: 'data-[state=on]:bg-[#0ea5e9]/15 data-[state=on]:text-foreground' },
  collaborative: { icon: 'text-[#10b981]', activeBg: 'data-[state=on]:bg-[#10b981]/15 data-[state=on]:text-foreground' },
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
