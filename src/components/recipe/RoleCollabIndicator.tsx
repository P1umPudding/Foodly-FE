import { Pencil, Eye, Users, Share2, type LucideIcon } from 'lucide-react'
import { myRole, collaborationState, type Role, type Collaboration } from '../../api/views'
import { useCurrentUserId } from '../../catalog/CatalogProvider'
import type { Recipe } from '../../api/protocol'

// Always neutral grey — the icon shape and aria-label carry the access meaning;
// colour never does. (The active filter is shown by the toolbar, not the rows.)
const iconClass = 'h-3.5 w-3.5 text-muted-foreground/70'

type Icon = { Icon: LucideIcon; label: string }

// Only what tells the user something: owner and private are the default for "my
// recipes", so they get no icon (#103). 'other' never reaches the list (canViewRecipe).
const ROLE: Partial<Record<Role, Icon>> = {
  editor: { Icon: Pencil, label: 'Bearbeiter' },
  viewer: { Icon: Eye, label: 'Betrachter' },
}

const COLLAB: Partial<Record<Collaboration, Icon>> = {
  shared: { Icon: Share2, label: 'geteilt (nur lesen)' },
  collaborative: { Icon: Users, label: 'kollaborativ' },
}

export function RoleCollabIndicator({ recipe }: { recipe: Recipe }) {
  const role = ROLE[myRole(recipe, useCurrentUserId())]
  const collab = COLLAB[collaborationState(recipe)]
  if (!role && !collab) return null
  return (
    <span className="inline-flex items-center gap-1">
      {role && (
        <span role="img" aria-label={role.label}>
          <role.Icon className={iconClass} />
        </span>
      )}
      {collab && (
        <span role="img" aria-label={collab.label}>
          <collab.Icon className={iconClass} />
        </span>
      )}
    </span>
  )
}
