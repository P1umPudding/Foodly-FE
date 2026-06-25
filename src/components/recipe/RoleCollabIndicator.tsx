import { Crown, Pencil, Eye, Lock, Users, Share2 } from 'lucide-react'
import { myRole, collaborationState, type Role, type Collaboration } from '../../api/views'
import { useCurrentUserId } from '../../catalog/CatalogProvider'
import { ROLE_COLOR, COLLAB_COLOR } from '../../list/access'
import type { Recipe } from '../../api/protocol'

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

export function RoleCollabIndicator({ recipe }: { recipe: Recipe }) {
  const roleKey = myRole(recipe, useCurrentUserId())
  const collabKey = collaborationState(recipe)
  const role = ROLE[roleKey]
  const collab = COLLAB[collabKey]
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-label={role.label}>
        <role.Icon className={`h-3.5 w-3.5 ${ROLE_COLOR[roleKey].icon}`} />
      </span>
      <span aria-label={collab.label}>
        <collab.Icon className={`h-3.5 w-3.5 ${COLLAB_COLOR[collabKey].icon}`} />
      </span>
    </span>
  )
}
