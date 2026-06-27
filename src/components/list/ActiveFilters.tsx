import { useState } from 'react'
import { Badge, Button } from '@postxl/ui-components'
import { X, RotateCcw } from 'lucide-react'
import type { ListState } from '../../list/state'
import { UNCATEGORIZED_ID } from '../../list/filter'
import type { Tag, Ingredient, UserCategory } from '../../api/protocol'

const ROLE_LABELS = { owner: 'Besitzer', editor: 'Bearbeiter', viewer: 'Betrachter' } as const
const COLLAB_LABELS = { private: 'Privat', shared: 'Geteilt', collaborative: 'Kollaborativ' } as const

// Above this many chips the row collapses to a "+N weitere" expander so a pile of
// selected tags/ingredients can't dominate the page.
const CHIP_LIMIT = 10

type Chip = { key: string; label: string; remove: () => void }

// Removable summary of every active filter facet (search excepted — it has its own
// clear in the search field), plus a reset-all. Mirrors the FilterControls facets.
export function ActiveFilters({
  state,
  set,
  clear,
  categories,
  tags,
  ingredients,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  clear: () => void
  categories: UserCategory[]
  tags: Tag[]
  ingredients: Ingredient[]
}) {
  const [expanded, setExpanded] = useState(false)
  const catName = (id: number) =>
    id === UNCATEGORIZED_ID ? 'Ohne Kategorie' : (categories.find((c) => c.id === id)?.name ?? `#${id}`)
  const ingName = (id: number) => ingredients.find((i) => i.id === id)?.name ?? `#${id}`

  const chips: Chip[] = [
    ...state.categories.map((id) => ({
      key: `cat-${id}`,
      label: catName(id),
      remove: () => set({ categories: state.categories.filter((x) => x !== id) }),
    })),
    ...(state.role !== 'any'
      ? [{ key: 'role', label: `Rolle: ${ROLE_LABELS[state.role]}`, remove: () => set({ role: 'any' }) }]
      : []),
    ...(state.collab !== 'any'
      ? [{ key: 'collab', label: `Freigabe: ${COLLAB_LABELS[state.collab]}`, remove: () => set({ collab: 'any' }) }]
      : []),
    ...(state.durationMax !== null
      ? [{ key: 'dmax', label: `≤ ${state.durationMax} Min`, remove: () => set({ durationMax: null }) }]
      : []),
    ...state.tags.map((id) => ({
      key: `tag-${id}`,
      // tag ids are their names; verify it's a known tag for a stable label
      label: tags.find((t) => t.id === id)?.id ?? id,
      remove: () => set({ tags: state.tags.filter((x) => x !== id) }),
    })),
    ...state.ingredients.map((id) => ({
      key: `ing-${id}`,
      label: ingName(id),
      remove: () => set({ ingredients: state.ingredients.filter((x) => x !== id) }),
    })),
  ]

  if (chips.length === 0) return null

  const overLimit = chips.length > CHIP_LIMIT
  const shown = overLimit && !expanded ? chips.slice(0, CHIP_LIMIT) : chips

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shown.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 text-sm font-normal">
          <span className="truncate">{chip.label}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${chip.label} entfernen`}
            onClick={chip.remove}
            className="-mr-0.5 h-4 w-4 rounded-full hover:bg-foreground/10"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      {overLimit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="h-7 px-2 text-muted-foreground"
        >
          {expanded ? 'weniger' : `+${chips.length - CHIP_LIMIT} weitere`}
        </Button>
      )}
      {/* Calm at rest, destructive-red on hover/focus so it reads as "clears everything". */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clear}
        className="gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Alle zurücksetzen
      </Button>
    </div>
  )
}
