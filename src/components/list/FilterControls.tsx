import { useState, type ReactNode } from 'react'
import {
  Badge,
  Button,
  Input,
  Separator,
  Skeleton,
  Slider,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@postxl/ui-components'
import { Crown, Pencil, Eye, Lock, Share2, Users, ListChecks } from 'lucide-react'
import type { ListState, RoleFilter, CollabFilter } from '../../list/state'
import { ROLE_COLOR, COLLAB_COLOR, collabDisabled, roleDisabled, roleAllowsCollab } from '../../list/access'
import { normalizeText } from '../../list/search'
import type { Tag, Ingredient, UserCategory } from '../../api/protocol'
import { CategorySidebar } from './CategorySidebar'
import { SearchInput } from './SearchInput'
import { TagIcon } from '../TagText'

// Upper bound for the work-time slider (minutes). Beyond this we treat it as "no
// limit" — the slider's max position clears durationMax rather than capping at it.
const DURATION_MAX = 180
const DURATION_PRESETS = [15, 30, 60] as const

// Neutral "selected" emphasis for filter chips — selection reads via fill + ring +
// weight, not a brand hue (colour stays reserved for category/access meaning).
const SELECTED_CHIP = 'bg-foreground/15 font-medium text-foreground ring-1 ring-inset ring-foreground/30'

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

// One labelled filter group — scannable structure across Kategorien, Tags, Zutaten,
// Arbeitszeit, Zugriff. `count` shows how many options are selected in this group.
function FilterGroup({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
        {title}
        {count !== undefined && count > 0 && (
          <span className="tabular-nums text-xs font-normal text-muted-foreground">{count}</span>
        )}
      </h3>
      {children}
    </section>
  )
}

// A sub-field label inside a group (Rolle, Freigabe, …).
function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>
}

// Search field + a select/deselect-all toggle for the visible options. `ids` are
// the currently-filtered option ids; the toggle adds them all or removes them all.
function FieldSearchRow<T extends string | number>({
  query,
  onQuery,
  placeholder,
  ids,
  selected,
  onChange,
}: {
  query: string
  onQuery: (v: string) => void
  placeholder: string
  ids: T[]
  selected: T[]
  onChange: (next: T[]) => void
}) {
  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id))
  const toggleAll = () => {
    if (allSelected) {
      const drop = new Set<T>(ids)
      onChange(selected.filter((id) => !drop.has(id)))
    } else {
      onChange(Array.from(new Set<T>([...selected, ...ids])))
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <SearchInput value={query} onChange={onQuery} placeholder={placeholder} className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={allSelected ? 'Auswahl aufheben' : 'Alle auswählen'}
            disabled={ids.length === 0}
            onClick={toggleAll}
            className="shrink-0 gap-1.5"
          >
            <ListChecks className="h-4 w-4" />
            {allSelected ? 'Keine' : 'Alle'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{allSelected ? 'Auswahl aufheben' : 'Alle auswählen'}</TooltipContent>
      </Tooltip>
    </div>
  )
}

const ROLE_META = {
  owner: { Icon: Crown, label: 'Besitzer', desc: 'Nur Rezepte, deren Besitzer du bist' },
  editor: { Icon: Pencil, label: 'Bearbeiter', desc: 'Nur Rezepte, die du bearbeiten darfst' },
  viewer: { Icon: Eye, label: 'Betrachter', desc: 'Nur Rezepte, die du nur ansehen darfst' },
} as const

const COLLAB_META = {
  private: { Icon: Lock, label: 'Privat', desc: 'Nur private Rezepte' },
  shared: { Icon: Share2, label: 'Geteilt', desc: 'Nur geteilte Rezepte (nur lesen)' },
  collaborative: { Icon: Users, label: 'Kollaborativ', desc: 'Nur kollaborativ bearbeitete Rezepte' },
} as const

function DurationFilter({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* px gives the knob's hover ring room — the sticky rail's overflow-y-auto
            also clips horizontally, which would otherwise cut the ring at the ends.
            Needs ≥ half-thumb (8px) + ring (4px). */}
        <div className="flex-1 px-4">
          <Slider
            aria-label="Maximale Arbeitszeit"
            // Neutral (not the brand purple): colour is reserved for meaning. Range
            // via the built-in gray variant; knob border + hover ring recoloured to
            // neutral through the data-slot hooks the component exposes.
            sliderVariant="gray"
            min={0}
            max={DURATION_MAX}
            step={5}
            // null (no filter) parks the knob at the max; every drag yields a real
            // minute value — the far-right end is DURATION_MAX, never "no limit".
            value={[value ?? DURATION_MAX]}
            onValueChange={([v]) => onChange(v)}
            className="w-full [&_[data-slot=slider-thumb]]:border-muted-foreground [&_[data-slot=slider-thumb]]:ring-muted-foreground/40"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">≤</span>
          <Input
            type="number"
            min={0}
            max={DURATION_MAX}
            className="w-16"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
          />
          <span className="text-sm text-muted-foreground">Min</span>
        </div>
      </div>
      <div className="flex gap-1.5">
        {DURATION_PRESETS.map((m) => (
          <Button
            key={m}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={value === m}
            onClick={() => onChange(value === m ? null : m)}
            className={`flex-1 ${value === m ? 'border-foreground/30 bg-foreground/10 font-medium text-foreground' : ''}`}
          >
            ≤ {m} Min
          </Button>
        ))}
      </div>
    </div>
  )
}

export function FilterControls({
  state,
  set,
  categories,
  categoriesLoading = false,
  onToggleCategory,
  tags,
  ingredients,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  categories: UserCategory[]
  categoriesLoading?: boolean
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
      <FilterGroup title="Kategorien" count={state.categories.length}>
        {categoriesLoading ? (
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-md" />
            ))}
          </div>
        ) : (
          <CategorySidebar categories={categories} selected={state.categories} onToggle={onToggleCategory} />
        )}
      </FilterGroup>

      {tags.length > 0 && (
        <>
          <Separator />
          <FilterGroup title="Tags" count={state.tags.length}>
            <FieldSearchRow
              query={tagQuery}
              onQuery={setTagQuery}
              placeholder="Tag suchen…"
              ids={filteredTags.map((t) => t.id)}
              selected={state.tags}
              onChange={(next) => set({ tags: next })}
            />
            <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
              {filteredTags.map((t) => (
                <Badge
                  key={t.id}
                  variant="secondary"
                  className={`flex cursor-pointer items-center gap-1 text-sm ${state.tags.includes(t.id) ? SELECTED_CHIP : ''}`}
                  onClick={() => set({ tags: toggle(state.tags, t.id) })}
                >
                  {t.svg && <TagIcon hash={t.svg} alt={t.id} size="sm" />}
                  {t.id}
                </Badge>
              ))}
            </div>
          </FilterGroup>
        </>
      )}

      {ingredients.length > 0 && (
        <>
          <Separator />
          <FilterGroup title="Zutaten" count={state.ingredients.length}>
            <FieldSearchRow
              query={ingredientQuery}
              onQuery={setIngredientQuery}
              placeholder="Zutat suchen…"
              ids={filteredIngredients.map((i) => i.id)}
              selected={state.ingredients}
              onChange={(next) => set({ ingredients: next })}
            />
            <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
              {filteredIngredients.map((i) => (
                <Badge
                  key={i.id}
                  variant="secondary"
                  className={`cursor-pointer text-sm ${state.ingredients.includes(i.id) ? SELECTED_CHIP : ''}`}
                  onClick={() => set({ ingredients: toggle(state.ingredients, i.id) })}
                >
                  {i.name}
                </Badge>
              ))}
            </div>
          </FilterGroup>
        </>
      )}

      <Separator />

      <FilterGroup title="Arbeitszeit" count={state.durationMax !== null ? 1 : 0}>
        <DurationFilter value={state.durationMax} onChange={(v) => set({ durationMax: v })} />
      </FilterGroup>

      <Separator />

      {/* Power-user facet, kept last. Deselecting the active segment resets that axis to 'any';
          greyed options stay clickable — relax-on-click resets the sister axis. */}
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
              const meta = ROLE_META[r]
              const disabled = roleDisabled(r, state.collab)
              const selected = state.role === r
              return (
                <Tooltip key={r}>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value={r}
                      className={`flex h-auto flex-1 flex-col items-center gap-0.5 py-1.5 text-sm leading-tight ${selected ? ROLE_COLOR[r].selected : ''} ${disabled ? 'opacity-40' : ''}`}
                    >
                      {/* size-3.5 matches the row indicator icons (RoleCollabIndicator h-3.5 w-3.5) */}
                      <meta.Icon className={`size-3.5 shrink-0 ${ROLE_COLOR[r].icon}`} />
                      {meta.label}
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    {disabled ? 'Passt nicht zur gewählten Freigabe – Klick setzt sie zurück' : meta.desc}
                  </TooltipContent>
                </Tooltip>
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
              const meta = COLLAB_META[c]
              const disabled = collabDisabled(c, state.role)
              const selected = state.collab === c
              return (
                <Tooltip key={c}>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value={c}
                      className={`flex h-auto flex-1 flex-col items-center gap-0.5 py-1.5 text-sm leading-tight ${selected ? COLLAB_COLOR[c].selected : ''} ${disabled ? 'opacity-40' : ''}`}
                    >
                      {/* size-3.5 matches the row indicator icons (RoleCollabIndicator h-3.5 w-3.5) */}
                      <meta.Icon className={`size-3.5 shrink-0 ${COLLAB_COLOR[c].icon}`} />
                      {meta.label}
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    {disabled ? 'Passt nicht zur gewählten Rolle – Klick setzt sie zurück' : meta.desc}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </ToggleGroup>
        </div>
      </FilterGroup>
    </div>
  )
}
