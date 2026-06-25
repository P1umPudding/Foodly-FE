import { Crown, Pencil, Eye, Lock, Users, Share2 } from 'lucide-react'
import { myRole, collaborationState, type Role, type Collaboration } from '../../api/views'
import { useCurrentUserId } from '../../catalog/CatalogProvider'
import type { Recipe } from '../../api/protocol'

const ROLE = {
  owner: { Icon: Crown, label: 'Besitzer' },
  editor: { Icon: Pencil, label: 'Bearbeiter' },
  viewer: { Icon: Eye, label: 'Betrachter' },
  other: { Icon: Eye, label: 'Kein Zugriff' },
} satisfies Record<Role, { Icon: typeof Crown; label: string }>

// Colour reinforces collaboration but never carries meaning alone — aria-label + title do.
const COLLAB = {
  private: { Icon: Lock, label: 'privat', tint: 'text-muted-foreground' },
  shared: { Icon: Share2, label: 'geteilt (nur lesen)', tint: 'text-[#0ea5e9]' },
  collaborative: { Icon: Users, label: 'kollaborativ', tint: 'text-[#10b981]' },
} satisfies Record<Collaboration, { Icon: typeof Lock; label: string; tint: string }>

export function RoleCollabIndicator({ recipe }: { recipe: Recipe }) {
  const role = ROLE[myRole(recipe, useCurrentUserId())]
  const collab = COLLAB[collaborationState(recipe)]
  // Baseline hint via native title + aria-label: no TooltipProvider dependency,
  // test-robust. A layout pass MAY upgrade to the library `Tooltip` once provider
  // placement is decided. (A tooltip hint is not one of CLAUDE.md's "interactive
  // controls", so native title is allowed here.)
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-label={role.label} title={role.label}>
        <role.Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
      <span aria-label={collab.label} title={collab.label}>
        <collab.Icon className={`h-3.5 w-3.5 ${collab.tint}`} />
      </span>
    </span>
  )
}
