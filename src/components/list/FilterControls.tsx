import { useState, type ReactNode } from 'react'
import { Input, Badge, Button, Separator, ToggleGroup, ToggleGroupItem } from '@postxl/ui-components'
import { Crown, Pencil, Eye, Lock, Share2, Users } from 'lucide-react'
import type { ListState, RoleFilter, CollabFilter } from '../../list/state'
import { normalizeText } from '../../list/search'
import type { Tag, Ingredient, UserCategory } from '../../api/protocol'
import { CategorySidebar } from './CategorySidebar'

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

// One labelled filter group (uppercase header + body). The groups — Kategorien,
// Verfeinern, Zugriff — give the rail a scannable structure.
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

// A sub-field label inside a group (Tags, Zutaten, Rolle, …).
function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>
}

export function FilterControls({
  state,
  set,
  categories,
  onToggleCategory,
  tags,
  ingredients,
  active,
  onClear,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  categories: UserCategory[]
  onToggleCategory: (id: number) => void
  tags: Tag[]
  ingredients: Ingredient[]
  active: boolean
  onClear: () => void
}) {
  const [ingredientQuery, setIngredientQuery] = useState('')

  const filteredIngredients =
    ingredientQuery.trim() === ''
      ? ingredients
      : ingredients.filter((i) => normalizeText(i.name).includes(normalizeText(ingredientQuery)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Rezepte suchen…" value={state.search} onChange={(e) => set({ search: e.target.value })} />
        {active && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-auto shrink-0 px-2 py-1 text-xs">
            Zurücksetzen
          </Button>
        )}
      </div>

      <FilterGroup title="Kategorien">
        <CategorySidebar categories={categories} selected={state.categories} onToggle={onToggleCategory} />
      </FilterGroup>

      <Separator />

      <FilterGroup title="Verfeinern">
        {tags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Tags</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <Badge
                  key={t.id}
                  variant={state.tags.includes(t.id) ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => set({ tags: toggle(state.tags, t.id) })}
                >
                  {t.id}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {ingredients.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Zutaten</FieldLabel>
            <Input
              placeholder="Zutat suchen…"
              value={ingredientQuery}
              onChange={(e) => setIngredientQuery(e.target.value)}
            />
            <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
              {filteredIngredients.map((i) => (
                <Badge
                  key={i.id}
                  variant={state.ingredients.includes(i.id) ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => set({ ingredients: toggle(state.ingredients, i.id) })}
                >
                  {i.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Maximale Arbeitszeit</FieldLabel>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">≤</span>
            <Input
              type="number"
              className="w-20"
              placeholder="Minuten"
              value={state.durationMax ?? ''}
              onChange={(e) => set({ durationMax: e.target.value === '' ? null : Number(e.target.value) })}
            />
            <span className="text-sm text-muted-foreground">Arbeitszeit</span>
          </div>
        </div>
      </FilterGroup>

      <Separator />

      {/* Deselecting the active segment resets that axis to 'any'. */}
      <FilterGroup title="Zugriff">
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Rolle</FieldLabel>
          <ToggleGroup
            type="single"
            className="w-full"
            value={state.role === 'any' ? '' : state.role}
            onValueChange={(v) => set({ role: (v || 'any') as RoleFilter })}
          >
            <ToggleGroupItem
              value="owner"
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
            >
              <Crown className="size-6" />
              Besitzer
            </ToggleGroupItem>
            <ToggleGroupItem
              value="editor"
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
            >
              <Pencil className="size-6" />
              Bearbeiter
            </ToggleGroupItem>
            <ToggleGroupItem
              value="viewer"
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
            >
              <Eye className="size-6" />
              Betrachter
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Freigabe</FieldLabel>
          <ToggleGroup
            type="single"
            className="w-full"
            value={state.collab === 'any' ? '' : state.collab}
            onValueChange={(v) => set({ collab: (v || 'any') as CollabFilter })}
          >
            <ToggleGroupItem
              value="private"
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
            >
              <Lock className="size-6" />
              Privat
            </ToggleGroupItem>
            <ToggleGroupItem
              value="shared"
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-[#0ea5e9]/15 data-[state=on]:text-foreground"
            >
              <Share2 className="size-6" />
              Geteilt
            </ToggleGroupItem>
            <ToggleGroupItem
              value="collaborative"
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] leading-tight data-[state=on]:bg-[#10b981]/15 data-[state=on]:text-foreground"
            >
              <Users className="size-6" />
              Kollaborativ
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </FilterGroup>
    </div>
  )
}
