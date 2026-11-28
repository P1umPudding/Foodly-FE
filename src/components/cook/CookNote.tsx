import { StickyNote } from 'lucide-react'
import { foodly } from '../../api'
import type { RecipeId } from '../../api/protocol'
import { useRequest } from '../../hooks/useRequest'
import { ResponsivePanel } from '../ResponsivePanel'
import { TriggerButton } from '../TriggerButton'

// The private note in cook mode, read-only (edited on the detail page). Nothing shows while loading, on error or
// without a note, so the header doesn't jump.
export function CookNote({ recipeId }: { recipeId: RecipeId }) {
  const { data: note } = useRequest(() => foodly.getMyNote(recipeId), [recipeId])
  if (!note?.trim()) return null
  return (
    <ResponsivePanel
      trigger={
        <TriggerButton variant="outline" size="sm" aria-label="Meine Notiz" className="gap-1.5 touch:h-10">
          <StickyNote className="size-4" aria-hidden />
          <span className="phone:sr-only">Notiz</span>
        </TriggerButton>
      }
      popover={{ align: 'end', className: 'w-80', 'aria-label': 'Meine Notiz' }}
      sheet={{ title: 'Meine Notiz', description: 'Deine private Notiz zu diesem Rezept' }}
    >
      {(variant) => (
        <>
          {variant === 'popover' && <h2 className="mb-2 text-sm font-semibold text-foreground">Meine Notiz</h2>}
          <p className="text-base whitespace-pre-wrap text-foreground">{note}</p>
        </>
      )}
    </ResponsivePanel>
  )
}
