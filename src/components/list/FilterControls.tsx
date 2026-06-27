import { useState, type ReactNode } from 'react'
import {
  Badge,
  Button,
  NumberInput,
  Separator,
  Skeleton,
  Slider,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@postxl/ui-components'
import { Crown, Pencil, Eye, Lock, Share2, Users, X } from 'lucide-react'
import type { ListState, RoleFilter, CollabFilter } from '../../list/state'
import { collabDisabled, roleDisabled, roleAllowsCollab } from '../../list/access'
import { normalizeText } from '../../list/search'
import type { Tag, Ingredient, UserCategory } from '../../api/protocol'
import { CategorySidebar } from './CategorySidebar'
import { SearchInput } from './SearchInput'
import { TagIcon } from '../TagText'

// Upper bound for the work-time slider (minutes). Beyond this we treat it as "no
// limit" — the slider's max position clears durationMax rather than capping at it.
const DURATION_MAX = 180
const DURATION_PRESETS = [15, 30, 60] as const

// Neutral "selected" emphasis for filter chips/toggles — selection reads via fill +
// ring + weight, not a brand hue (colour stays reserved for category/access meaning).
const SELECTED_CHIP = 'bg-foreground/15 font-medium text-foreground ring-1 ring-inset ring-foreground/30'

// Extra row gap below the "selected" chips so they read as their own block.
const SELECTED_ROW = 'mb-2.5 flex flex-wrap gap-1'
const REST_ROW = 'flex flex-wrap gap-1'

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

// Reset link for a single facet — sits right-aligned next to the group heading,
// only while that facet has a selection.
function ClearButton({ onClick, label = 'Zurücksetzen' }: { onClick: () => void; label?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
    >
      <X className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}

// One labelled filter group — scannable structure across Kategorien, Tags, Zutaten,
// Arbeitszeit, Zugriff. `count` shows how many options are selected; `action` (the
// per-facet clear) is right-aligned in the heading row.
function FilterGroup({
  title,
  count,
  action,
  children,
}: {
  title: string
  count?: number
  action?: ReactNode
  children: ReactNode
}) {
  const heading = (
    <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
      {title}
      {count !== undefined && count > 0 && (
        <span className="tabular-nums text-xs font-normal text-muted-foreground">{count}</span>
      )}
    </h3>
  )
  return (
    <section className="flex flex-col gap-3">
      {/* The "Zurücksetzen" button is absolutely placed so it overlays the heading row
          (taller than the text) without changing its height — the heading, and the
          content below, stay put whether or not the button is shown. */}
      {action ? (
        <div className="relative">
          {heading}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">{action}</div>
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  )
}

// A sub-field label inside a group (Rolle, Freigabe, …).
function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>
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

function clamp(v: number): number {
  return Math.min(DURATION_MAX, Math.max(0, v))
}

function DurationFilter({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const presetActive = (DURATION_PRESETS as readonly number[]).includes(value ?? -1)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* px gives the knob's hover ring room — the sticky rail's overflow-y-auto
            also clips horizontally, which would otherwise cut the ring at the ends.
            Needs ≥ half-thumb (8px) + ring (4px). */}
        <div className="min-w-0 flex-1 px-4">
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
        {/* Real numeric field (digits only, right-aligned); ≤ / Min as affixes. */}
        <NumberInput
          aria-label="Maximale Arbeitszeit in Minuten"
          value={value ?? undefined}
          onChange={(v) => onChange(v === undefined ? null : clamp(v))}
          min={0}
          max={DURATION_MAX}
          showSpinButtons={false}
          prefix="≤"
          suffix="Min"
          wrapperClassName="min-h-8 w-28 shrink-0"
          // dark:bg-transparent so the input area matches the wrapper (the lib leaves
          // dark:bg-input/30 on the input, which otherwise differs from prefix/suffix).
          className="bg-transparent text-right dark:bg-transparent"
        />
      </div>
      {/* Ghost segmented presets — same look as the Zugriff toggles (no outline/fill
          until active or hovered). Selection is JS-driven so typing 60 lights ≤60. */}
      <ToggleGroup
        type="single"
        className="w-full"
        value={presetActive ? String(value) : ''}
        onValueChange={(v) => onChange(v === '' ? null : Number(v))}
      >
        {DURATION_PRESETS.map((m) => (
          <ToggleGroupItem
            key={m}
            value={String(m)}
            aria-label={`≤ ${m} Minuten`}
            className={`h-7 flex-1 px-1.5 text-xs ${value === m ? SELECTED_CHIP : ''}`}
          >
            ≤ {m} Min
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

export function FilterControls({
  state,
  set,
  categories,
  categoriesLoading = false,
  onToggleCategory,
  uncategorizedCount = 0,
  tags,
  ingredients,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  categories: UserCategory[]
  categoriesLoading?: boolean
  onToggleCategory: (id: number) => void
  uncategorizedCount?: number
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

  const tagSelected = (id: string) => state.tags.includes(id)
  const ingSelected = (id: number) => state.ingredients.includes(id)

  const tagChip = (t: Tag) => (
    <Badge
      key={t.id}
      variant="secondary"
      className={`flex cursor-pointer items-center gap-1 text-sm ${tagSelected(t.id) ? SELECTED_CHIP : ''}`}
      onClick={() => set({ tags: toggle(state.tags, t.id) })}
    >
      {t.svg && <TagIcon hash={t.svg} alt={t.id} size="sm" />}
      {t.id}
    </Badge>
  )

  const ingChip = (i: Ingredient) => (
    <Badge
      key={i.id}
      variant="secondary"
      className={`cursor-pointer text-sm ${ingSelected(i.id) ? SELECTED_CHIP : ''}`}
      onClick={() => set({ ingredients: toggle(state.ingredients, i.id) })}
    >
      {i.name}
    </Badge>
  )

  // pr keeps the inner Tags/Zutaten scrollbars off the rail's own scrollbar.
  return (
    <div className="flex flex-col gap-4 pr-1.5">
      <FilterGroup
        title="Kategorien"
        count={state.categories.length}
        action={state.categories.length > 0 ? <ClearButton onClick={() => set({ categories: [] })} /> : undefined}
      >
        {categoriesLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <CategorySidebar
            categories={categories}
            selected={state.categories}
            onToggle={onToggleCategory}
            uncategorizedCount={uncategorizedCount}
          />
        )}
      </FilterGroup>

      {tags.length > 0 && (
        <>
          <Separator />
          <FilterGroup
            title="Tags"
            count={state.tags.length}
            action={state.tags.length > 0 ? <ClearButton onClick={() => set({ tags: [] })} /> : undefined}
          >
            <SearchInput value={tagQuery} onChange={setTagQuery} placeholder="Tag suchen…" />
            <div className="flex max-h-40 flex-col overflow-y-auto">
              {filteredTags.some((t) => tagSelected(t.id)) && (
                <div className={SELECTED_ROW}>{filteredTags.filter((t) => tagSelected(t.id)).map(tagChip)}</div>
              )}
              <div className={REST_ROW}>{filteredTags.filter((t) => !tagSelected(t.id)).map(tagChip)}</div>
            </div>
          </FilterGroup>
        </>
      )}

      {ingredients.length > 0 && (
        <>
          <Separator />
          <FilterGroup
            title="Zutaten"
            count={state.ingredients.length}
            action={state.ingredients.length > 0 ? <ClearButton onClick={() => set({ ingredients: [] })} /> : undefined}
          >
            <SearchInput value={ingredientQuery} onChange={setIngredientQuery} placeholder="Zutat suchen…" />
            <div className="flex max-h-32 flex-col overflow-y-auto">
              {filteredIngredients.some((i) => ingSelected(i.id)) && (
                <div className={SELECTED_ROW}>{filteredIngredients.filter((i) => ingSelected(i.id)).map(ingChip)}</div>
              )}
              <div className={REST_ROW}>{filteredIngredients.filter((i) => !ingSelected(i.id)).map(ingChip)}</div>
            </div>
          </FilterGroup>
        </>
      )}

      <Separator />

      <FilterGroup
        title="Arbeitszeit"
        action={state.durationMax !== null ? <ClearButton onClick={() => set({ durationMax: null })} /> : undefined}
      >
        <DurationFilter value={state.durationMax} onChange={(v) => set({ durationMax: v })} />
      </FilterGroup>

      <Separator />

      {/* Power-user facet, kept last. Deselecting the active segment resets that axis to 'any';
          greyed options stay clickable — relax-on-click resets the sister axis. Buttons are
          neutral (no access colour): selection reads via fill + ring, impossible combos greyed. */}
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
                      className={`flex h-auto min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-sm leading-tight ${selected ? SELECTED_CHIP : ''} ${disabled ? 'opacity-40' : ''}`}
                    >
                      {/* size-3.5 matches the row indicator icons (RoleCollabIndicator h-3.5 w-3.5) */}
                      <meta.Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{meta.label}</span>
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
                      className={`flex h-auto min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-sm leading-tight ${selected ? SELECTED_CHIP : ''} ${disabled ? 'opacity-40' : ''}`}
                    >
                      {/* size-3.5 matches the row indicator icons (RoleCollabIndicator h-3.5 w-3.5) */}
                      <meta.Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{meta.label}</span>
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
