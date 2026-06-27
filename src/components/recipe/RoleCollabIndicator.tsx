import { Crown, Pencil, Eye, Lock, Users, Share2 } from 'lucide-react'
import { myRole, collaborationState, type Role, type Collaboration } from '../../api/views'
import { useCurrentUserId } from '../../catalog/CatalogProvider'
import type { Recipe } from '../../api/protocol'

// Always neutral grey — the icon shape and aria-label carry the access meaning;
// colour never does. (The active filter is shown by the toolbar, not the rows.)
const iconClass = 'h-3.5 w-3.5 text-muted-foreground/70'

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
  const role = ROLE[myRole(recipe, useCurrentUserId())]
  const collab = COLLAB[collaborationState(recipe)]
  return (
    <span className="inline-flex items-center gap-1">
      <span role="img" aria-label={role.label}>
        <role.Icon className={iconClass} />
      </span>
      <span role="img" aria-label={collab.label}>
        <collab.Icon className={iconClass} />
      </span>
    </span>
  )
}
