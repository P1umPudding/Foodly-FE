import { Crown, Pencil, Eye, Lock, Users, Share2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { myRole, collaborationState, type Role, type Collaboration } from '../../api/views'
import { useCurrentUserId } from '../../catalog/CatalogProvider'
import { ROLE_COLOR, COLLAB_COLOR } from '../../list/access'
import type { RoleFilter, CollabFilter } from '../../list/state'
import type { Recipe } from '../../api/protocol'

// Grey at rest; the row's `group` hover reveals the muted access colour. An icon
// also shows its colour permanently when its value is the active filter — so a
// matching row visibly explains why it's in the result set.
function iconClass(colored: boolean, color: { icon: string; iconHover: string }): string {
  return colored
    ? `h-3.5 w-3.5 transition-colors ${color.icon}`
    : `h-3.5 w-3.5 text-muted-foreground/70 transition-colors ${color.iconHover}`
}

const ROLE = {
  owner: { Icon: Crown, label: 'Besitzer' },
  editor: { Icon: Pencil, label: 'Bearbeiter' },
  viewer: { Icon: Eye, label: 'Betrachter' },
  other: { Icon: Eye, label: 'Kein Zugriff' },
} satisfies Record<Role, { Icon: typeof Crown; label: string }>

const COLLAB = {
  private: { Icon: Lock, label: 'privat' },
  shared: { Icon: Share2, label: 'geteilt (nur lesen)' },
  collaborative: { Icon: Users, label: 'kollaborativ' },
} satisfies Record<Collaboration, { Icon: typeof Lock; label: string }>

export function RoleCollabIndicator({
  recipe,
  activeRole = 'any',
  activeCollab = 'any',
}: {
  recipe: Recipe
  activeRole?: RoleFilter
  activeCollab?: CollabFilter
}) {
  const roleKey = myRole(recipe, useCurrentUserId())
  const collabKey = collaborationState(recipe)
  const role = ROLE[roleKey]
  const collab = COLLAB[collabKey]
  return (
    <span className="inline-flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <span aria-label={role.label}>
            <role.Icon className={iconClass(activeRole === roleKey, ROLE_COLOR[roleKey])} />
          </span>
        </TooltipTrigger>
        <TooltipContent>{role.label}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span aria-label={collab.label}>
            <collab.Icon className={iconClass(activeCollab === collabKey, COLLAB_COLOR[collabKey])} />
          </span>
        </TooltipTrigger>
        <TooltipContent>{collab.label}</TooltipContent>
      </Tooltip>
    </span>
  )
}
