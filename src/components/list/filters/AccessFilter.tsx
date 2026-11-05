import { useId, useRef, type ComponentType } from 'react'
import { Label, RadioGroup, RadioGroupItem, Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { Crown, Pencil, Eye, Lock, Share2, Users } from 'lucide-react'
import type { ListState, RoleFilter, CollabFilter } from '../../../list/state'
import { collabDisabled, roleDisabled, roleAllowsCollab } from '../../../list/access'

type Meta = { Icon: ComponentType<{ className?: string }>; label: string; desc: string }

const ROLE_META: Record<Exclude<RoleFilter, 'any'>, Meta> = {
  owner: { Icon: Crown, label: 'Besitzer', desc: 'Nur Rezepte, deren Besitzer du bist' },
  editor: { Icon: Pencil, label: 'Bearbeiter', desc: 'Nur Rezepte, die du bearbeiten darfst' },
  viewer: { Icon: Eye, label: 'Betrachter', desc: 'Nur Rezepte, die du nur ansehen darfst' },
}

const COLLAB_META: Record<Exclude<CollabFilter, 'any'>, Meta> = {
  private: { Icon: Lock, label: 'Privat', desc: 'Nur private Rezepte' },
  shared: { Icon: Share2, label: 'Geteilt', desc: 'Nur geteilte Rezepte (nur lesen)' },
  collaborative: { Icon: Users, label: 'Kollaborativ', desc: 'Nur kollaborativ bearbeitete Rezepte' },
}

// Impossible role × sharing combos (src/list/access.ts) are greyed but stay clickable: last click wins and the
// sister axis relaxes to 'any'.
export function AccessFilter({
  role,
  collab,
  set,
}: {
  role: RoleFilter
  collab: CollabFilter
  set: (patch: Partial<ListState>) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <AccessGroup
        title="Meine Rolle"
        value={role}
        meta={ROLE_META}
        isGreyed={(r) => roleDisabled(r, collab)}
        greyedReason="Passt nicht zur gewählten Freigabe – Klick setzt sie zurück"
        onChange={(next) => set({ role: next, collab: roleAllowsCollab(next, collab) ? collab : 'any' })}
      />
      <AccessGroup
        title="Freigabe"
        value={collab}
        meta={COLLAB_META}
        isGreyed={(c) => collabDisabled(c, role)}
        greyedReason="Passt nicht zur gewählten Rolle – Klick setzt sie zurück"
        onChange={(next) => set({ collab: next, role: roleAllowsCollab(role, next) ? role : 'any' })}
      />
    </div>
  )
}

function AccessGroup<V extends string>({
  title,
  value,
  meta,
  isGreyed,
  greyedReason,
  onChange,
}: {
  title: string
  value: V | 'any'
  meta: Record<V, Meta>
  isGreyed: (option: V) => boolean
  greyedReason: string
  onChange: (next: V | 'any') => void
}) {
  const baseId = useId()
  const titleId = `${baseId}-title`
  const options: (V | 'any')[] = ['any', ...(Object.keys(meta) as V[])]
  // Radix selects a radio as soon as arrow keys focus it. On a greyed option that would silently relax the
  // other axis, so arrowing only passes over greyed options; Space or a click still picks them.
  const arrowKeyDown = useRef(false)
  return (
    <div className="flex flex-col gap-1.5">
      <span id={titleId} className="text-sm text-muted-foreground">
        {title}
      </span>
      <RadioGroup
        aria-labelledby={titleId}
        value={value}
        onKeyDownCapture={(e) => {
          if (e.key.startsWith('Arrow')) arrowKeyDown.current = true
        }}
        onKeyUpCapture={() => {
          arrowKeyDown.current = false
        }}
        onValueChange={(v) => {
          const next = v as V | 'any'
          if (arrowKeyDown.current && next !== 'any' && isGreyed(next)) return
          onChange(next)
        }}
        className="gap-0.5"
      >
        {options.map((option) => {
          const id = `${baseId}-${option}`
          const reasonId = `${id}-reason`
          const m = option === 'any' ? null : meta[option as V]
          const greyed = option !== 'any' && isGreyed(option as V)
          // Faded content, not the item: the radio's focus ring stays at full strength (#95).
          const content = (
            <span className={cn('flex min-w-0 items-center gap-2', greyed && 'opacity-40')}>
              {m ? <m.Icon className="size-3.5 shrink-0" /> : <span aria-hidden className="size-3.5 shrink-0" />}
              <span className="truncate">{m ? m.label : 'Alle'}</span>
            </span>
          )
          return (
            <div key={option} className="flex items-center gap-2 rounded-sm px-1 hover:bg-muted phone:min-h-10">
              <RadioGroupItem value={option} id={id} aria-describedby={greyed ? reasonId : undefined} />
              {/* Overrides postxl Label's text-base/leading-none/font-medium, like FilterCheckRow. */}
              <Label
                htmlFor={id}
                className="min-w-0 flex-1 cursor-pointer self-stretch py-1 text-sm leading-snug font-normal"
              >
                {m ? (
                  // Trigger on a span: postxl Label can't take a ref, and the Radix item would lose its data-state.
                  <Tooltip>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent>{greyed ? greyedReason : m.desc}</TooltipContent>
                  </Tooltip>
                ) : (
                  content
                )}
              </Label>
              {/* The tooltip is hover-only; keyboard and phone users get the reason as the radio's description. */}
              {greyed && (
                <span id={reasonId} className="sr-only">
                  {greyedReason}
                </span>
              )}
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}
