import type { Role, Collaboration } from '../api/views'
import type { RoleFilter, CollabFilter } from './state'

// Access (role/Freigabe) colour is the *muted* axis — category colour is the loud
// one. These hues are deliberately desaturated and chosen to never collide with a
// category hex (#e11d48 / #0ea5e9 / #f59e0b / #10b981). Colour never carries
// meaning alone — the icon shape and the aria-label/tooltip do.
//
// One source for both surfaces:
//   • `icon`        — the muted text colour, shown always on the filter toggles.
//   • `iconHover`   — grouped so the row indicator stays neutral grey at rest and
//                     only reveals the muted colour on row hover/focus.
//   • `selected`    — the styling for the chosen Rolle/Freigabe segment: an
//                     access-colour fill + inset ring + medium weight. Applied via
//                     a JS-computed `selected` flag, NOT `data-[state=on]:` — the
//                     Tooltip wrapping each ToggleGroupItem clobbers Radix's
//                     `data-state` (it becomes the tooltip's open/closed), so a
//                     `data-[state=on]:` variant would never match.
type AccessColor = { icon: string; iconHover: string; selected: string }

export const ROLE_COLOR: Record<Role, AccessColor> = {
  owner: {
    icon: 'text-[#a07b3f]',
    iconHover: 'group-hover:text-[#a07b3f] group-focus-visible:text-[#a07b3f]',
    selected: 'bg-[#a07b3f]/20 font-medium text-foreground ring-1 ring-inset ring-[#a07b3f]/60',
  },
  editor: {
    icon: 'text-[#7b6ca6]',
    iconHover: 'group-hover:text-[#7b6ca6] group-focus-visible:text-[#7b6ca6]',
    selected: 'bg-[#7b6ca6]/20 font-medium text-foreground ring-1 ring-inset ring-[#7b6ca6]/60',
  },
  viewer: {
    icon: 'text-[#6b7280]',
    iconHover: 'group-hover:text-[#6b7280] group-focus-visible:text-[#6b7280]',
    selected: 'bg-[#6b7280]/20 font-medium text-foreground ring-1 ring-inset ring-[#6b7280]/60',
  },
  other: { icon: 'text-muted-foreground', iconHover: '', selected: '' },
}

export const COLLAB_COLOR: Record<Collaboration, AccessColor> = {
  private: {
    icon: 'text-[#6b7280]',
    iconHover: 'group-hover:text-[#6b7280] group-focus-visible:text-[#6b7280]',
    selected: 'bg-[#6b7280]/20 font-medium text-foreground ring-1 ring-inset ring-[#6b7280]/60',
  },
  shared: {
    icon: 'text-[#5f7f9c]',
    iconHover: 'group-hover:text-[#5f7f9c] group-focus-visible:text-[#5f7f9c]',
    selected: 'bg-[#5f7f9c]/20 font-medium text-foreground ring-1 ring-inset ring-[#5f7f9c]/60',
  },
  collaborative: {
    icon: 'text-[#5a9183]',
    iconHover: 'group-hover:text-[#5a9183] group-focus-visible:text-[#5a9183]',
    selected: 'bg-[#5a9183]/20 font-medium text-foreground ring-1 ring-inset ring-[#5a9183]/60',
  },
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
