import { useState, type ReactNode } from 'react'
import {
  Input,
  Badge,
  Separator,
  ToggleGroup,
  ToggleGroupItem,
  Collapse,
  CollapseTrigger,
  CollapseContent,
} from '@postxl/ui-components'
import { Crown, Pencil, Eye, Lock, Share2, Users, ChevronDown } from 'lucide-react'
import type { ListState, RoleFilter, CollabFilter } from '../../list/state'
import { ROLE_COLOR, COLLAB_COLOR, collabDisabled, roleDisabled, roleAllowsCollab } from '../../list/access'
import { normalizeText } from '../../list/search'
import type { Tag, Ingredient, UserCategory } from '../../api/protocol'
import { CategorySidebar } from './CategorySidebar'
import { TagIcon } from '../TagText'

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

// One labelled filter group — scannable structure across Kategorien, Zugriff, Weitere Filter.
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

// A sub-field label inside a group (Rolle, Freigabe, …).
function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>
}

// A collapsible sub-field with a labelled trigger — used for Tags and Zutaten.
// Defaults collapsed (Radix Collapsible opens only when defaultOpen is set).
function CollapsibleField({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <Collapse className="group/field flex flex-col gap-1.5">
      <CollapseTrigger className="flex items-center gap-2 text-sm text-muted-foreground">
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]/field:-rotate-90" />
        <span>{title}</span>
        {count !== undefined && <span className="tabular-nums text-xs">{count}</span>}
      </CollapseTrigger>
      <CollapseContent className="flex flex-col gap-1.5 pt-1">{children}</CollapseContent>
    </Collapse>
  )
}

export function FilterControls({
  state,
  set,
  categories,
  onToggleCategory,
  tags,
  ingredients,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  categories: UserCategory[]
  onToggleCategory: (id: number) => void
  tags: Tag[]
  ingredients: Ingredient[]
}) {
  const [ingredientQuery, setIngredientQuery] = useState('')
  const [tagQuery, setTagQuery] = useState('')

  const filteredIngredients =
    ingredientQuery.trim() === ''
      ? ingredients
      : ingredients.filter((i) => normalizeText(i.name).includes(normalizeText(ingredientQuery)))

  const filteredTags =
    tagQuery.trim() === '' ? tags : tags.filter((t) => normalizeText(t.id).includes(normalizeText(tagQuery)))

  return (
    <div className="flex flex-col gap-4">
      <FilterGroup title="Kategorien">
        <CategorySidebar categories={categories} selected={state.categories} onToggle={onToggleCategory} />
      </FilterGroup>

      <Separator />

      {/* Deselecting the active segment resets that axis to 'any'. Greyed options stay clickable — relax-on-click resets the sister axis. */}
      <FilterGroup title="Zugriff">
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Rolle</FieldLabel>
          <ToggleGroup
            type="single"
            className="w-full"
            value={state.role === 'any' ? '' : state.role}
            onValueChange={(v) => {
              const role = (v || 'any') as RoleFilter
              // last-click-wins: relax collab if the new role can't pair with it
              set({ role, collab: roleAllowsCollab(role, state.collab) ? state.collab : 'any' })
            }}
          >
            {(['owner', 'editor', 'viewer'] as const).map((r) => {
              const meta = {
                owner: { Icon: Crown, label: 'Besitzer' },
                editor: { Icon: Pencil, label: 'Bearbeiter' },
                viewer: { Icon: Eye, label: 'Betrachter' },
              }[r]
              const disabled = roleDisabled(r, state.collab)
              return (
                <ToggleGroupItem
                  key={r}
                  value={r}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-sm leading-tight ${ROLE_COLOR[r].activeBg} ${disabled ? 'opacity-40' : ''}`}
                >
                  <meta.Icon className={`size-7 ${ROLE_COLOR[r].icon}`} />
                  {meta.label}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Freigabe</FieldLabel>
          <ToggleGroup
            type="single"
            className="w-full"
            value={state.collab === 'any' ? '' : state.collab}
            onValueChange={(v) => {
              const collab = (v || 'any') as CollabFilter
              set({ collab, role: roleAllowsCollab(state.role, collab) ? state.role : 'any' })
            }}
          >
            {(['private', 'shared', 'collaborative'] as const).map((c) => {
              const meta = {
                private: { Icon: Lock, label: 'Privat' },
                shared: { Icon: Share2, label: 'Geteilt' },
                collaborative: { Icon: Users, label: 'Kollaborativ' },
              }[c]
              const disabled = collabDisabled(c, state.role)
              return (
                <ToggleGroupItem
                  key={c}
                  value={c}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-sm leading-tight ${COLLAB_COLOR[c].activeBg} ${disabled ? 'opacity-40' : ''}`}
                >
                  <meta.Icon className={`size-7 ${COLLAB_COLOR[c].icon}`} />
                  {meta.label}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        </div>
      </FilterGroup>

      <Separator />

      <FilterGroup title="Weitere Filter">
        <div className="flex flex-col gap-5">
          {tags.length > 0 && (
            <CollapsibleField title="Tags" count={state.tags.length || undefined}>
              <Input
                placeholder="Tag suchen…"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                className="focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                {filteredTags.map((t) => (
                  <Badge
                    key={t.id}
                    variant={state.tags.includes(t.id) ? 'default' : 'secondary'}
                    className="flex cursor-pointer items-center gap-1 text-sm"
                    onClick={() => set({ tags: toggle(state.tags, t.id) })}
                  >
                    {t.svg && <TagIcon hash={t.svg} alt={t.id} size="sm" />}
                    {t.id}
                  </Badge>
                ))}
              </div>
            </CollapsibleField>
          )}

          {ingredients.length > 0 && (
            <CollapsibleField title="Zutaten" count={state.ingredients.length || undefined}>
              <Input
                placeholder="Zutat suchen…"
                value={ingredientQuery}
                onChange={(e) => setIngredientQuery(e.target.value)}
                className="focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                {filteredIngredients.map((i) => (
                  <Badge
                    key={i.id}
                    variant={state.ingredients.includes(i.id) ? 'default' : 'secondary'}
                    className="cursor-pointer text-sm"
                    onClick={() => set({ ingredients: toggle(state.ingredients, i.id) })}
                  >
                    {i.name}
                  </Badge>
                ))}
              </div>
            </CollapsibleField>
          )}

          <div className="flex flex-col gap-1.5">
            <FieldLabel>Maximale Arbeitszeit</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">≤</span>
              <Input
                type="number"
                className="w-20 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Minuten"
                value={state.durationMax ?? ''}
                onChange={(e) => set({ durationMax: e.target.value === '' ? null : Number(e.target.value) })}
              />
              <span className="text-sm text-muted-foreground">Arbeitszeit</span>
            </div>
          </div>
        </div>
      </FilterGroup>
    </div>
  )
}
