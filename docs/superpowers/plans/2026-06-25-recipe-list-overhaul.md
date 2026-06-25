# Recipe-list Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganise the recipe-list page around a right-hand (mobile-drawer) filter rail and make filtering, the access model, and category grouping more legible (icons, colors, collapsibles, rule-based grey-out, permanent color-coded category groups).

**Architecture:** Frontend-only React/TS changes to `src/pages/RecipeList.tsx` and `src/components/list/*` + `src/components/recipe/RoleCollabIndicator.tsx`. Two new pure modules (`src/list/palette.ts`, `src/list/access.ts`) centralise category colors and access colors+validity. Two state dimensions (`group`, `durationField`) are removed.

**Tech Stack:** Vite + React Router + TypeScript, Tailwind v4, `@postxl/ui-components` (postxl), `lucide-react` icons, Vitest + Testing Library.

## Global Constraints

- **UI components:** all interactive UI via `@postxl/ui-components` (Input, Button, Badge, Select, ToggleGroup, Collapse, Sheet, Separator, Checkbox). Never hand-roll `<button>`/`<input>`.
- **No tooltips via `title=""`** — use postxl `Tooltip` if ever needed (this plan mostly *removes* tooltips).
- **Tailwind-first:** no inline `style={{}}`, no new CSS. All custom values via Tailwind arbitrary utilities (`text-[#f59e0b]`, `bg-[#e11d48]/15`, `border-l-2`). Class strings must be **literal** (the v4 scanner only keeps literals — no `bg-[${hex}]`).
- **Category colors = approach A:** a literal-class palette map; unknown hex → neutral fallback.
- **Formatting:** Prettier (no semicolons, single quotes, 2-space, printWidth 120). Run `npm run format` before the PR.
- **Commits:** local only; do **not** push. **No `Co-Authored-By` trailer.**
- **Build gate:** `npm run build` (tsc + vite) must pass; `npm test` (vitest) must pass.
- **Colors must read in light AND dark mode** — fixed mid-500 hues reused via literal classes (not theme tokens).

**Test commands:**
- Single file: `npx vitest run <path>`
- Single test: `npx vitest run <path> -t "<name>"`
- All: `npm test`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/list/palette.ts` *(new)* | Category hex → `{ border, bgActive, text, line, dot }` literal Tailwind classes; neutral fallback |
| `src/list/access.ts` *(new)* | Role/Collab icon+active-bg color classes; role×collab validity helpers for grey-out |
| `src/list/state.ts` | Remove `group`/`GroupView` + `durationField` |
| `src/list/url.ts` | Drop `group`/`dfield` (de)serialisation |
| `src/list/useListState.ts` | Drop `group`/`dfield` from `OUR_KEYS` |
| `src/list/filter.ts` | `withinDuration` always uses `workMinutes` |
| `src/components/recipe/RoleCollabIndicator.tsx` | No tooltips; color both icons via `access.ts` |
| `src/components/list/RecipeListView.tsx` | Always grouped; collapsible groups; color heading + vertical line |
| `src/components/list/CategorySidebar.tsx` | Color-coded toggle buttons (palette.ts) |
| `src/components/list/ListToolbar.tsx` | Icon-only sort; clearer detail toggle; group toggle removed |
| `src/components/list/ResultCount.tsx` *(new)* | `matching / total` count display |
| `src/components/list/FilterControls.tsx` | Reorder/rename/headings/font/spacing; collapsible+searchable Tags & Zutaten + tag icons; Zugriff icons/colors/grey-out; search+reset removed |
| `src/pages/RecipeList.tsx` | Layout flip (rail right + mobile Sheet); full-width search w/ X; count; focus-ring off |

**Task order & dependencies:** 1 (palette) and 2 (access) are leaves. 3 (state removal) forces minimal consumer edits to keep the build green. 4 needs 2; 5 & 6 need 1; 7 follows 3; 8 (page) relocates search out of FilterControls; 9 & 10 finish FilterControls. Tasks 8/9/10 edit the same two files sequentially.

---

### Task 1: `palette.ts` — category color classes

**Files:**
- Create: `src/list/palette.ts`
- Test: `src/list/palette.test.ts`

**Interfaces:**
- Produces: `colorClasses(hex: string): { border: string; bgActive: string; text: string; line: string; dot: string }` — literal Tailwind classes; unknown hex → neutral set.

- [ ] **Step 1: Write the failing test**

Create `src/list/palette.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { colorClasses } from './palette'

describe('colorClasses', () => {
  it('maps a known palette hex to its literal classes', () => {
    const c = colorClasses('#e11d48')
    expect(c.text).toBe('text-[#e11d48]')
    expect(c.border).toBe('border-[#e11d48]')
    expect(c.bgActive).toBe('bg-[#e11d48]/15')
    expect(c.line).toBe('border-[#e11d48]')
    expect(c.dot).toBe('bg-[#e11d48]')
  })

  it('falls back to a neutral set for unknown colors', () => {
    const c = colorClasses('#123456')
    expect(c.text).toBe('text-muted-foreground')
    expect(c.border).toBe('border-border')
    expect(c.bgActive).toBe('bg-muted')
    expect(c.dot).toBe('bg-muted')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/list/palette.test.ts`
Expected: FAIL — cannot find module `./palette`.

- [ ] **Step 3: Write minimal implementation**

Create `src/list/palette.ts`:

```ts
// Category colours come from data (`UserCategory.color`, a hex string), but the
// Tailwind v4 scanner only keeps *literal* class strings — a dynamic
// `bg-[${hex}]` is never generated. So we map each known palette hex to a fixed
// set of literal classes (approach A). Unknown colours fall back to neutral.
// When the backend ever supplies arbitrary colours, switch to a CSS-variable
// bridge (theme.css → styles.css); see the historical note in git for SWATCH.

export type ColorClasses = {
  border: string // outline (inactive toggle, category accent)
  bgActive: string // filled tint (active toggle)
  text: string // heading / label tint
  line: string // left rule colour (used with border-l-2)
  dot: string // solid swatch
}

const NEUTRAL: ColorClasses = {
  border: 'border-border',
  bgActive: 'bg-muted',
  text: 'text-muted-foreground',
  line: 'border-border',
  dot: 'bg-muted',
}

const PALETTE: Record<string, ColorClasses> = {
  '#e11d48': { border: 'border-[#e11d48]', bgActive: 'bg-[#e11d48]/15', text: 'text-[#e11d48]', line: 'border-[#e11d48]', dot: 'bg-[#e11d48]' },
  '#0ea5e9': { border: 'border-[#0ea5e9]', bgActive: 'bg-[#0ea5e9]/15', text: 'text-[#0ea5e9]', line: 'border-[#0ea5e9]', dot: 'bg-[#0ea5e9]' },
  '#f59e0b': { border: 'border-[#f59e0b]', bgActive: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', line: 'border-[#f59e0b]', dot: 'bg-[#f59e0b]' },
  '#10b981': { border: 'border-[#10b981]', bgActive: 'bg-[#10b981]/15', text: 'text-[#10b981]', line: 'border-[#10b981]', dot: 'bg-[#10b981]' },
}

export function colorClasses(hex: string): ColorClasses {
  return PALETTE[hex] ?? NEUTRAL
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/list/palette.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/list/palette.ts src/list/palette.test.ts
git commit -m "feat(list): category colour palette map (literal Tailwind classes)"
```

---

### Task 2: `access.ts` — role/collab colors + validity

**Files:**
- Create: `src/list/access.ts`
- Test: `src/list/access.test.ts`

**Interfaces:**
- Consumes: `Role` (`'owner'|'editor'|'viewer'|'other'`) and `Collaboration` (`'private'|'shared'|'collaborative'`) from `src/api/views.ts`; `RoleFilter`/`CollabFilter` from `src/list/state.ts`.
- Produces:
  - `ROLE_COLOR: Record<Role, { icon: string; activeBg: string }>`
  - `COLLAB_COLOR: Record<Collaboration, { icon: string; activeBg: string }>`
  - `roleAllowsCollab(role: RoleFilter, collab: CollabFilter): boolean`
  - `collabDisabled(collab: Exclude<CollabFilter, 'any'>, selectedRole: RoleFilter): boolean`
  - `roleDisabled(role: Exclude<RoleFilter, 'any'>, selectedCollab: CollabFilter): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/list/access.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { roleAllowsCollab, collabDisabled, roleDisabled, ROLE_COLOR, COLLAB_COLOR } from './access'

describe('roleAllowsCollab (§D matrix, 6 of 9 valid)', () => {
  const cases: [string, string, boolean][] = [
    ['owner', 'private', true],
    ['owner', 'shared', true],
    ['owner', 'collaborative', true],
    ['editor', 'private', false],
    ['editor', 'shared', false],
    ['editor', 'collaborative', true],
    ['viewer', 'private', false],
    ['viewer', 'shared', true],
    ['viewer', 'collaborative', true],
  ]
  it.each(cases)('%s × %s → %s', (role, collab, expected) => {
    expect(roleAllowsCollab(role as never, collab as never)).toBe(expected)
  })

  it('treats "any" on either axis as always allowed', () => {
    expect(roleAllowsCollab('any', 'private')).toBe(true)
    expect(roleAllowsCollab('editor', 'any')).toBe(true)
    expect(roleAllowsCollab('any', 'any')).toBe(true)
  })
})

describe('disabled helpers', () => {
  it('greys impossible collab options for a selected role', () => {
    expect(collabDisabled('private', 'editor')).toBe(true)
    expect(collabDisabled('shared', 'editor')).toBe(true)
    expect(collabDisabled('collaborative', 'editor')).toBe(false)
    expect(collabDisabled('private', 'viewer')).toBe(true)
    expect(collabDisabled('shared', 'viewer')).toBe(false)
  })
  it('greys impossible role options for a selected collab', () => {
    expect(roleDisabled('editor', 'private')).toBe(true)
    expect(roleDisabled('viewer', 'private')).toBe(true)
    expect(roleDisabled('owner', 'private')).toBe(false)
    expect(roleDisabled('editor', 'shared')).toBe(true)
  })
  it('disables nothing while the sister axis is "any"', () => {
    expect(collabDisabled('private', 'any')).toBe(false)
    expect(roleDisabled('editor', 'any')).toBe(false)
  })
})

describe('colour maps', () => {
  it('exposes literal icon classes per type', () => {
    expect(ROLE_COLOR.owner.icon).toBe('text-[#f59e0b]')
    expect(COLLAB_COLOR.collaborative.icon).toBe('text-[#10b981]')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/list/access.test.ts`
Expected: FAIL — cannot find module `./access`.

- [ ] **Step 3: Write minimal implementation**

Create `src/list/access.ts`:

```ts
import type { Role, Collaboration } from '../api/views'
import type { RoleFilter, CollabFilter } from './state'

// Colour reinforces the access type but never carries meaning alone — the icon
// and the aria-label do. One source for both the filter toggles and the row
// indicator. `activeBg` is the data-[state=on] tint used by ToggleGroupItem.
export const ROLE_COLOR: Record<Role, { icon: string; activeBg: string }> = {
  owner: { icon: 'text-[#f59e0b]', activeBg: 'data-[state=on]:bg-[#f59e0b]/15 data-[state=on]:text-foreground' },
  editor: { icon: 'text-[#8b5cf6]', activeBg: 'data-[state=on]:bg-[#8b5cf6]/15 data-[state=on]:text-foreground' },
  viewer: { icon: 'text-[#64748b]', activeBg: 'data-[state=on]:bg-[#64748b]/15 data-[state=on]:text-foreground' },
  other: { icon: 'text-muted-foreground', activeBg: '' },
}

export const COLLAB_COLOR: Record<Collaboration, { icon: string; activeBg: string }> = {
  private: { icon: 'text-[#64748b]', activeBg: 'data-[state=on]:bg-[#64748b]/15 data-[state=on]:text-foreground' },
  shared: { icon: 'text-[#0ea5e9]', activeBg: 'data-[state=on]:bg-[#0ea5e9]/15 data-[state=on]:text-foreground' },
  collaborative: { icon: 'text-[#10b981]', activeBg: 'data-[state=on]:bg-[#10b981]/15 data-[state=on]:text-foreground' },
}

// §D validity matrix: my role can force the sharing state. Only these 6 of 9
// (role × collaboration) combinations are logically possible.
const VALID = new Set<string>([
  'owner|private',
  'owner|shared',
  'owner|collaborative',
  'editor|collaborative',
  'viewer|shared',
  'viewer|collaborative',
])

export function roleAllowsCollab(role: RoleFilter, collab: CollabFilter): boolean {
  if (role === 'any' || collab === 'any') return true
  return VALID.has(`${role}|${collab}`)
}

// A collab option is greyed when a concrete role is selected that can never pair
// with it. (And symmetrically for role options.) "any" on the sister axis greys
// nothing.
export function collabDisabled(collab: Exclude<CollabFilter, 'any'>, selectedRole: RoleFilter): boolean {
  return selectedRole !== 'any' && !roleAllowsCollab(selectedRole, collab)
}

export function roleDisabled(role: Exclude<RoleFilter, 'any'>, selectedCollab: CollabFilter): boolean {
  return selectedCollab !== 'any' && !roleAllowsCollab(role, selectedCollab)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/list/access.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/list/access.ts src/list/access.test.ts
git commit -m "feat(list): access colour maps + role×collab validity helpers"
```

---

### Task 3: Remove `flat` grouping and the `Gesamtzeit` filter field from state and all consumers

This deletes two state dimensions (`group`, `durationField`) and updates every reference so the build stays green. Visual polish of the now-permanent grouping comes in Tasks 5/7.

**Files:**
- Modify: `src/list/state.ts`, `src/list/url.ts`, `src/list/useListState.ts`, `src/list/filter.ts`
- Modify (forced by the type removal): `src/components/list/RecipeListView.tsx`, `src/components/list/ListToolbar.tsx`, `src/components/list/FilterControls.tsx`, `src/pages/RecipeList.tsx`
- Test: `src/list/state.test.ts`, `src/list/url.test.ts`, `src/list/filter.test.ts`, `src/components/list/RecipeListView.test.tsx`

**Interfaces:**
- Produces: `ListState` without `group`/`GroupView` and without `durationField`. `RecipeListView` prop shape becomes `{ recipes, categories, detail }` (no `group`). `withinDuration(recipe, max)` (no `field`).

- [ ] **Step 1: Update the failing tests first (red)**

In `src/list/state.test.ts` remove the `group` field from the input object (line ~22) and the `expect(out.group)...` assertion (line ~28). If the test builds a full `ListState` literal, drop the `group:` and `durationField:` keys.

In `src/list/url.test.ts` remove `durationField: 'overall',` (line ~15) and `group: 'by-category',` (line ~22) from the round-trip fixture.

In `src/list/filter.test.ts` remove any `durationField:` key from literal `ListState` objects (prefer spreading `DEFAULT_STATE`).

In `src/components/list/RecipeListView.test.tsx` change line ~41 from:

```tsx
<RecipeListView recipes={recipes} categories={cats} group="by-category" detail="detailed" />
```
to:
```tsx
<RecipeListView recipes={recipes} categories={cats} detail="detailed" />
```

- [ ] **Step 2: Run tests to verify they fail (type/compile errors expected)**

Run: `npx vitest run src/list/state.test.ts src/list/url.test.ts src/list/filter.test.ts src/components/list/RecipeListView.test.tsx`
Expected: FAIL — `group`/`durationField` still exist in types, or `RecipeListView` still requires `group`.

- [ ] **Step 3: Edit `src/list/state.ts`**

Delete the `GroupView` type and the two fields. Result:

```ts
export type RoleFilter = 'any' | 'owner' | 'editor' | 'viewer'
export type CollabFilter = 'any' | 'private' | 'shared' | 'collaborative'
export type SortKey = 'name' | 'work' | 'overall' | 'rating'
export type SortDir = 'asc' | 'desc'
export type DetailView = 'detailed' | 'compact'

export interface ListState {
  categories: number[] // OR within this facet
  tags: string[] // AND
  ingredients: number[] // AND (ingredient ids)
  durationMax: number | null // ≤, applied to workMinutes
  role: RoleFilter
  collab: CollabFilter
  search: string
  sortKey: SortKey
  sortDir: SortDir
  detail: DetailView
}

export const DEFAULT_STATE: ListState = {
  categories: [],
  tags: [],
  ingredients: [],
  durationMax: null,
  role: 'any',
  collab: 'any',
  search: '',
  sortKey: 'name',
  sortDir: 'asc',
  detail: 'detailed',
}

export function isFilterActive(s: ListState): boolean {
  return (
    s.categories.length > 0 ||
    s.tags.length > 0 ||
    s.ingredients.length > 0 ||
    s.durationMax !== null ||
    s.role !== 'any' ||
    s.collab !== 'any' ||
    s.search.trim() !== ''
  )
}

export function clearedState(s: ListState): ListState {
  return {
    ...s,
    categories: [],
    tags: [],
    ingredients: [],
    durationMax: null,
    role: 'any',
    collab: 'any',
    search: '',
  }
}
```

- [ ] **Step 4: Edit `src/list/url.ts`**

Remove the `GroupView` import, the `GROUPS` const, and the `group`/`dfield` lines. Specifically:
- In the import block delete `type GroupView,`.
- Delete `const GROUPS: GroupView[] = ['flat', 'by-category']`.
- In `toSearchParams` delete the `if (state.durationField !== ...) p.set('dfield', ...)` line and the `if (state.group !== ...) p.set('group', ...)` line.
- In `fromSearchParams` delete the `durationField:` line and the `group:` line.

- [ ] **Step 5: Edit `src/list/useListState.ts`**

Change `OUR_KEYS` to drop `'dfield'` and `'group'`:

```ts
const OUR_KEYS = ['cat', 'tag', 'ing', 'dmax', 'role', 'collab', 'q', 'sort', 'dir', 'view']
```

- [ ] **Step 6: Edit `src/list/filter.ts`**

Simplify `withinDuration` to always use `workMinutes`, and update its call:

```ts
function withinDuration(recipe: Recipe, max: number | null): boolean {
  if (max === null) return true
  return recipe.workMinutes !== null && recipe.workMinutes <= max // unknown (null) excluded
}
```
In `filterRecipes`, change `withinDuration(recipe, state.durationMax, state.durationField)` to `withinDuration(recipe, state.durationMax)`.

- [ ] **Step 7: Edit `src/components/list/RecipeListView.tsx`**

Drop the `group` prop and the `flat` branch; always render grouped (keep current visuals for now — Task 5 enhances them):

```tsx
import { RecipeRow } from '../recipe/RecipeRow'
import type { Recipe, UserCategory } from '../../api/protocol'
import type { DetailView } from '../../list/state'

function Rows({ recipes, compact }: { recipes: Recipe[]; compact: boolean }) {
  return (
    <div className="space-y-3">
      {recipes.map((r) => (
        <RecipeRow key={r.id} recipe={r} compact={compact} />
      ))}
    </div>
  )
}

export function RecipeListView({
  recipes,
  categories,
  detail,
}: {
  recipes: Recipe[]
  categories: UserCategory[]
  detail: DetailView
}) {
  const compact = detail === 'compact'
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const inAnyCategory = new Set<number>()
  for (const c of categories) for (const id of c.recipes) inAnyCategory.add(id)
  const uncategorised = recipes.filter((r) => !inAnyCategory.has(r.id))

  return (
    <div className="space-y-6">
      {ordered.map((c) => {
        const inThis = recipes.filter((r) => c.recipes.includes(r.id))
        if (inThis.length === 0) return null
        return (
          <section key={c.id}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">{c.name}</h3>
            <Rows recipes={inThis} compact={compact} />
          </section>
        )
      })}
      {uncategorised.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Ohne Kategorie</h3>
          <Rows recipes={uncategorised} compact={compact} />
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Edit `src/components/list/ListToolbar.tsx`**

Remove the group ToggleGroup block (the `Flache Liste` / `Nach Kategorie` toggle), the `List, FolderTree` imports, and the `GroupView` import. Leave the sort dropdown and the detail toggle intact (Task 7 reworks them). Confirm no remaining reference to `state.group`.

- [ ] **Step 9: Edit `src/components/list/FilterControls.tsx`**

Remove the Arbeitszeit/Gesamtzeit `ToggleGroup` from the "Maximale Zeit" field — the filter is always work-time now. Replace the field body (lines ~116-146) with just the `≤` prefix + minutes input:

```tsx
<div className="flex flex-col gap-1.5">
  <FieldLabel>Maximale Arbeitszeit</FieldLabel>
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">≤</span>
    <Input
      type="number"
      className="w-20"
      placeholder="Min."
      value={state.durationMax ?? ''}
      onChange={(e) => set({ durationMax: e.target.value === '' ? null : Number(e.target.value) })}
    />
    <span className="text-sm text-muted-foreground">Min.</span>
  </div>
</div>
```
Remove `ToggleGroup`/`ToggleGroupItem` from this field only if they're no longer used elsewhere in the file — they ARE still used by the Zugriff toggles, so keep the imports.

- [ ] **Step 10: Edit `src/pages/RecipeList.tsx`**

In the `<RecipeListView ... />` call, remove `group={state.group}` (keep `detail={state.detail}`). Remove the `groupingCategories` second arg? No — `groupingCategories(categories, state.categories)` stays. Just drop the `group` prop line.

- [ ] **Step 11: Run the updated tests + build**

Run: `npx vitest run src/list/state.test.ts src/list/url.test.ts src/list/filter.test.ts src/components/list/RecipeListView.test.tsx`
Expected: PASS.
Run: `npm run build`
Expected: tsc + vite succeed (no references to `group`/`durationField`).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "refactor(list): always group by category, drop flat list + Gesamtzeit filter field"
```

---

### Task 4: Recipe-row access icons — remove tooltips, add colors

**Files:**
- Modify: `src/components/recipe/RoleCollabIndicator.tsx`
- Test: `src/components/recipe/RoleCollabIndicator.test.tsx`

**Interfaces:**
- Consumes: `ROLE_COLOR`, `COLLAB_COLOR` from `src/list/access.ts`; `myRole`, `collaborationState` from `src/api/views.ts`.

- [ ] **Step 1: Update the test (red)**

Replace `src/components/recipe/RoleCollabIndicator.test.tsx`'s render wrappers — tooltips are gone, so drop `TooltipProvider`. The `getByLabelText` assertions stay (aria-labels are kept) and add a color-class assertion. Edit the two `it(...)` blocks to render without the provider:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RoleCollabIndicator } from './RoleCollabIndicator'
import type { Recipe } from '../../api/protocol'

vi.mock('../../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1 }))

// keep the existing `base` Recipe literal below this point unchanged
```
Then in each test replace:
```tsx
render(<TooltipProvider>{...}</TooltipProvider>)
```
with:
```tsx
render(<RoleCollabIndicator recipe={...} />)
```
Add one assertion to the owner/private test:
```tsx
expect(screen.getByLabelText(/Besitzer/i).querySelector('svg')?.getAttribute('class')).toContain('text-[#f59e0b]')
```
Remove the now-unused `TooltipProvider` import.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/recipe/RoleCollabIndicator.test.tsx`
Expected: FAIL — icons not yet coloured / component still imports Tooltip.

- [ ] **Step 3: Rewrite `RoleCollabIndicator.tsx`**

```tsx
import { Crown, Pencil, Eye, Lock, Users, Share2 } from 'lucide-react'
import { myRole, collaborationState, type Role, type Collaboration } from '../../api/views'
import { useCurrentUserId } from '../../catalog/CatalogProvider'
import { ROLE_COLOR, COLLAB_COLOR } from '../../list/access'
import type { Recipe } from '../../api/protocol'

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
  const roleKey = myRole(recipe, useCurrentUserId())
  const collabKey = collaborationState(recipe)
  const role = ROLE[roleKey]
  const collab = COLLAB[collabKey]
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-label={role.label}>
        <role.Icon className={`h-3.5 w-3.5 ${ROLE_COLOR[roleKey].icon}`} />
      </span>
      <span aria-label={collab.label}>
        <collab.Icon className={`h-3.5 w-3.5 ${COLLAB_COLOR[collabKey].icon}`} />
      </span>
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/recipe/RoleCollabIndicator.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/recipe/RoleCollabIndicator.tsx src/components/recipe/RoleCollabIndicator.test.tsx
git commit -m "feat(recipe): colour role/collab row icons, drop their tooltips"
```

---

### Task 5: Category-grouped list — collapsible groups, colored heading + vertical line

**Files:**
- Modify: `src/components/list/RecipeListView.tsx`
- Test: `src/components/list/RecipeListView.test.tsx`

**Interfaces:**
- Consumes: `colorClasses` from `src/list/palette.ts`; postxl `Collapse`, `CollapseTrigger`, `CollapseContent`.

- [ ] **Step 1: Add a test for collapsible + colored heading (red)**

Append to `src/components/list/RecipeListView.test.tsx` (the existing fixture `cats`/`recipes` already exist in the file — reuse them; ensure at least one category has `color: '#e11d48'`). Add:

```tsx
it('renders a collapsible, colour-coded heading per category', () => {
  render(<RecipeListView recipes={recipes} categories={cats} detail="detailed" />)
  const heading = screen.getByRole('button', { name: /Favoriten/i }) // CollapseTrigger is a button
  expect(heading.className).toContain('text-[#e11d48]')
})
```
(Adjust the category name in the matcher to whatever the fixture's `#e11d48` category is called.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/list/RecipeListView.test.tsx`
Expected: FAIL — heading is an `<h3>`, not a button; no color class.

- [ ] **Step 3: Rewrite `RecipeListView.tsx`**

```tsx
import { Collapse, CollapseContent, CollapseTrigger } from '@postxl/ui-components'
import { ChevronDown } from 'lucide-react'
import { RecipeRow } from '../recipe/RecipeRow'
import { colorClasses } from '../../list/palette'
import type { Recipe, UserCategory } from '../../api/protocol'
import type { DetailView } from '../../list/state'

function Rows({ recipes, compact }: { recipes: Recipe[]; compact: boolean }) {
  return (
    <div className="space-y-3">
      {recipes.map((r) => (
        <RecipeRow key={r.id} recipe={r} compact={compact} />
      ))}
    </div>
  )
}

// `color` null → neutral; uncategorised passes an empty string → neutral fallback.
function CategoryGroup({
  name,
  color,
  recipes,
  compact,
}: {
  name: string
  color: string
  recipes: Recipe[]
  compact: boolean
}) {
  const c = colorClasses(color)
  return (
    <Collapse defaultOpen className="group/cat">
      <CollapseTrigger
        className={`mb-2 flex w-full items-center gap-2 text-lg font-semibold ${c.text}`}
      >
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]/cat:-rotate-90" />
        <span className="min-w-0 truncate">{name}</span>
        <span className="tabular-nums text-sm font-normal text-muted-foreground">{recipes.length}</span>
      </CollapseTrigger>
      <CollapseContent>
        <div className={`border-l-2 pl-4 ${c.line}`}>
          <Rows recipes={recipes} compact={compact} />
        </div>
      </CollapseContent>
    </Collapse>
  )
}

export function RecipeListView({
  recipes,
  categories,
  detail,
}: {
  recipes: Recipe[]
  categories: UserCategory[]
  detail: DetailView
}) {
  const compact = detail === 'compact'
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const inAnyCategory = new Set<number>()
  for (const c of categories) for (const id of c.recipes) inAnyCategory.add(id)
  const uncategorised = recipes.filter((r) => !inAnyCategory.has(r.id))

  return (
    <div className="space-y-6">
      {ordered.map((c) => {
        const inThis = recipes.filter((r) => c.recipes.includes(r.id))
        if (inThis.length === 0) return null
        return <CategoryGroup key={c.id} name={c.name} color={c.color} recipes={inThis} compact={compact} />
      })}
      {uncategorised.length > 0 && (
        <CategoryGroup name="Ohne Kategorie" color="" recipes={uncategorised} compact={compact} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/list/RecipeListView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/list/RecipeListView.tsx src/components/list/RecipeListView.test.tsx
git commit -m "feat(list): collapsible, colour-coded category groups with left rule"
```

---

### Task 6: Category sidebar → color-coded toggle buttons

**Files:**
- Modify: `src/components/list/CategorySidebar.tsx`
- Test: `src/components/list/CategorySidebar.test.tsx` *(new)*

**Interfaces:**
- Consumes: `colorClasses` from `src/list/palette.ts`; postxl `Button`. Props unchanged: `{ categories, selected, onToggle }`.

- [ ] **Step 1: Write the failing test**

Create `src/components/list/CategorySidebar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CategorySidebar } from './CategorySidebar'
import type { UserCategory } from '../../api/protocol'

const cats: UserCategory[] = [
  { id: 1, user: 1, name: 'Favoriten', recipes: [10], order: 0, color: '#e11d48', colorLight: null, colorDark: null },
]

describe('CategorySidebar toggle buttons', () => {
  it('shows the category colour as a border when inactive and fires onToggle', () => {
    const onToggle = vi.fn()
    render(<CategorySidebar categories={cats} selected={[]} onToggle={onToggle} />)
    const btn = screen.getByRole('button', { name: /Favoriten/i })
    expect(btn.className).toContain('border-[#e11d48]')
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it('applies the colour tint when active', () => {
    render(<CategorySidebar categories={cats} selected={[1]} onToggle={() => {}} />)
    const btn = screen.getByRole('button', { name: /Favoriten/i })
    expect(btn.className).toContain('bg-[#e11d48]/15')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/list/CategorySidebar.test.tsx`
Expected: FAIL — current component uses a `SWATCH` dot, not border/tint classes.

- [ ] **Step 3: Rewrite `CategorySidebar.tsx`**

```tsx
import { Button } from '@postxl/ui-components'
import { colorClasses } from '../../list/palette'
import type { UserCategory } from '../../api/protocol'

// Toggle buttons: inactive = category-colour outline; active = filled with the
// colour at a low alpha. Multi-select (OR) — clicking toggles membership.
export function CategorySidebar({
  categories,
  selected,
  onToggle,
}: {
  categories: UserCategory[]
  selected: number[]
  onToggle: (id: number) => void
}) {
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return (
    <div className="flex flex-wrap gap-2">
      {ordered.map((c) => {
        const cc = colorClasses(c.color)
        const active = selected.includes(c.id)
        return (
          <Button
            key={c.id}
            type="button"
            variant="outline"
            onClick={() => onToggle(c.id)}
            aria-pressed={active}
            className={`h-auto gap-2 border px-3 py-1.5 text-sm font-normal ${cc.border} ${
              active ? `${cc.bgActive} ${cc.text}` : 'bg-transparent'
            }`}
          >
            <span className="truncate">{c.name}</span>
            <span className="tabular-nums text-xs text-muted-foreground">{c.recipes.length}</span>
          </Button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/list/CategorySidebar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/list/CategorySidebar.tsx src/components/list/CategorySidebar.test.tsx
git commit -m "feat(list): category sidebar as colour-coded toggle buttons"
```

---

### Task 7: Toolbar — icon-only sort + clearer detail toggle

**Files:**
- Modify: `src/components/list/ListToolbar.tsx`

**Interfaces:**
- Consumes: lucide `ArrowDownAZ, ArrowDownZA, Clock, Timer, Star, ArrowUpNarrowWide, ArrowDownWideNarrow, Rows3, Rows4`; postxl `Select*`, `ToggleGroup`, `ToggleGroupItem`.

- [ ] **Step 1: Rewrite `ListToolbar.tsx`**

The sort dropdown renders the *current* option's icons directly in the trigger (Radix `SelectValue` would be blank for icon-only items). Each `SelectItem` carries an `aria-label`. The detail toggle shows the active option's **label as text** (icon + word) and inactive as icon-only.

```tsx
// Toolbar next to the "Rezepte" heading: icon-only sort dropdown + detail toggle.
import { type ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@postxl/ui-components'
import {
  ArrowDownAZ,
  ArrowDownZA,
  Clock,
  Timer,
  Star,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Rows3,
  Rows4,
} from 'lucide-react'
import type { ListState, SortKey, SortDir, DetailView } from '../../list/state'

const Up = ArrowUpNarrowWide
const Down = ArrowDownWideNarrow

// value = `${sortKey}|${sortDir}`; node = the icon(s) shown in trigger + item.
const SORT_OPTIONS: { value: string; label: string; node: ReactNode }[] = [
  { value: 'name|asc', label: 'Name A–Z', node: <ArrowDownAZ className="h-4 w-4" /> },
  { value: 'name|desc', label: 'Name Z–A', node: <ArrowDownZA className="h-4 w-4" /> },
  { value: 'work|asc', label: 'Arbeitszeit kurz zuerst', node: <span className="flex items-center gap-0.5"><Clock className="h-4 w-4" /><Up className="h-3.5 w-3.5" /></span> },
  { value: 'work|desc', label: 'Arbeitszeit lang zuerst', node: <span className="flex items-center gap-0.5"><Clock className="h-4 w-4" /><Down className="h-3.5 w-3.5" /></span> },
  { value: 'overall|asc', label: 'Gesamtzeit kurz zuerst', node: <span className="flex items-center gap-0.5"><Timer className="h-4 w-4" /><Up className="h-3.5 w-3.5" /></span> },
  { value: 'overall|desc', label: 'Gesamtzeit lang zuerst', node: <span className="flex items-center gap-0.5"><Timer className="h-4 w-4" /><Down className="h-3.5 w-3.5" /></span> },
  { value: 'rating|desc', label: 'Bewertung beste zuerst', node: <span className="flex items-center gap-0.5"><Star className="h-4 w-4" /><Down className="h-3.5 w-3.5" /></span> },
  { value: 'rating|asc', label: 'Bewertung schlechteste zuerst', node: <span className="flex items-center gap-0.5"><Star className="h-4 w-4" /><Up className="h-3.5 w-3.5" /></span> },
]

export function ListToolbar({ state, set }: { state: ListState; set: (patch: Partial<ListState>) => void }) {
  const current = `${state.sortKey}|${state.sortDir}`
  const currentNode = SORT_OPTIONS.find((o) => o.value === current)?.node
  return (
    <div className="flex items-center gap-3">
      <Select
        value={current}
        onValueChange={(v) => {
          const [key, dir] = v.split('|') as [SortKey, SortDir]
          set({ sortKey: key, sortDir: dir })
        }}
      >
        <SelectTrigger aria-label="Sortierung" className="w-auto gap-1 px-3">
          {currentNode}
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            // textValue is required by Radix Select for non-text item content
            // (icon-only) — it powers typeahead + the accessible name.
            <SelectItem key={o.value} value={o.value} textValue={o.label} aria-label={o.label}>
              {o.node}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToggleGroup
        type="single"
        value={state.detail}
        onValueChange={(v) => v && set({ detail: v as DetailView })}
      >
        <ToggleGroupItem
          value="detailed"
          aria-label="Detailliert"
          className="gap-1.5 px-2.5 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
        >
          <Rows3 className="h-4 w-4" />
          {state.detail === 'detailed' && <span className="text-sm">Detailliert</span>}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="compact"
          aria-label="Kompakt"
          className="gap-1.5 px-2.5 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
        >
          <Rows4 className="h-4 w-4" />
          {state.detail === 'compact' && <span className="text-sm">Kompakt</span>}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + build**

Run: `npm run build`
Expected: PASS — no `GroupView`/`group` references remain; toolbar compiles.

- [ ] **Step 3: Visual check (Chrome MCP)**

Start the dev app and confirm: the sort dropdown is narrow and shows icon(s); opening it lists 8 icon rows; the detail toggle shows the active option's word, inactive icon-only.

- [ ] **Step 4: Commit**

```bash
git add src/components/list/ListToolbar.tsx
git commit -m "feat(list): icon-only sort dropdown + labelled active detail toggle"
```

---

### Task 8: Page layout — rail right + mobile Sheet, full-width search with X, result count

**Files:**
- Modify: `src/pages/RecipeList.tsx`
- Modify: `src/components/list/FilterControls.tsx` (remove its search bar + reset button + `active`/`onClear` props)
- Create: `src/components/list/ResultCount.tsx`
- Test: `src/components/list/ResultCount.test.tsx` *(new)*

**Interfaces:**
- Produces: `<ResultCount matching={number} total={number} />` rendering `"{matching} / {total}"`.
- Consumes: postxl `Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle`, `Input`, `Button`; lucide `X, Filter`.

- [ ] **Step 1: Write the ResultCount test (red)**

Create `src/components/list/ResultCount.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResultCount } from './ResultCount'

describe('ResultCount', () => {
  it('renders matching / total', () => {
    render(<ResultCount matching={12} total={47} />)
    expect(screen.getByText('12 / 47')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/list/ResultCount.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `ResultCount.tsx`**

```tsx
// Shows how many recipes match the current filter/search out of the total.
export function ResultCount({ matching, total }: { matching: number; total: number }) {
  return (
    <span className="tabular-nums text-sm text-muted-foreground" aria-label={`${matching} von ${total} Rezepten`}>
      {matching} / {total}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/list/ResultCount.test.tsx`
Expected: PASS.

- [ ] **Step 5: Remove search bar + reset from `FilterControls.tsx`**

Delete the leading search `<div className="flex items-center gap-2">…</div>` block (the `Input placeholder="Rezepte suchen…"` + the `active && <Button…>Zurücksetzen</Button>`). Remove `active` and `onClear` from the props type and destructuring. Keep everything else. The component's root becomes `<div className="flex flex-col gap-4">` starting directly with the first `FilterGroup`.

- [ ] **Step 6: Rewrite `RecipeList.tsx`**

Layout flips to content-left/rail-right; on `< md` the rail moves into a `Sheet`. Search is full-width under the heading with an `X` clear; the count sits in the heading row. Focus ring is disabled on the search input.

```tsx
import { useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
} from '@postxl/ui-components'
import { X, Filter } from 'lucide-react'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useCurrentUserId, useTags, useIngredients } from '../catalog/CatalogProvider'
import { useListState } from '../list/useListState'
import { filterRecipes, groupingCategories } from '../list/filter'
import { sortRecipes } from '../list/sort'
import { usedIngredients } from '../list/counts'
import { isFilterActive } from '../list/state'
import { FilterControls } from '../components/list/FilterControls'
import { ListToolbar } from '../components/list/ListToolbar'
import { RecipeListView } from '../components/list/RecipeListView'
import { ResultCount } from '../components/list/ResultCount'

export function RecipeList() {
  const [nonce, setNonce] = useState(0)
  const recipesReq = useRequest(() => foodly.listRecipes(), [nonce])
  const categoriesReq = useRequest(() => foodly.listCategories(), [nonce])
  const { state, set, clear } = useListState()
  const currentUserId = useCurrentUserId()
  const tags = useTags()
  const ingredients = useIngredients()

  const allRecipes = recipesReq.data ?? []
  const categories = categoriesReq.data ?? []
  const tagList = Object.values(tags.byId)
  const usedIngredientList = usedIngredients(allRecipes, ingredients.byId)
  const visible = sortRecipes(filterRecipes(allRecipes, state, currentUserId, categories), state, currentUserId)

  const filters = (
    <FilterControls
      state={state}
      set={set}
      categories={categories}
      onToggleCategory={(id) =>
        set({
          categories: state.categories.includes(id)
            ? state.categories.filter((x) => x !== id)
            : [...state.categories, id],
        })
      }
      tags={tagList}
      ingredients={usedIngredientList}
    />
  )

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 md:grid-cols-[1fr_18rem]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-3xl text-foreground">Rezepte</h1>
            <ResultCount matching={visible.length} total={allRecipes.length} />
          </div>
          <div className="flex items-center gap-3">
            <ListToolbar state={state} set={set} />
            {/* Mobile-only filter drawer trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 md:hidden">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[20rem] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filter</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{filters}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="relative mb-6">
          <Input
            placeholder="Rezepte suchen…"
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            className="w-full pr-9 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {state.search !== '' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Suche leeren"
              onClick={() => set({ search: '' })}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {recipesReq.status === 'loading' && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {recipesReq.status === 'error' && (
          <Alert variant="destructive">
            <AlertTitle>Konnte Rezepte nicht laden</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{recipesReq.error?.message}</span>
              <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
                Erneut versuchen
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {recipesReq.status === 'ready' && allRecipes.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">Noch keine Rezepte.</p>
        )}

        {recipesReq.status === 'ready' && allRecipes.length > 0 && visible.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">Keine Treffer für die aktuellen Filter.</p>
            {isFilterActive(state) && (
              <Button variant="outline" size="sm" onClick={clear}>
                Filter zurücksetzen
              </Button>
            )}
          </div>
        )}

        {recipesReq.status === 'ready' && visible.length > 0 && (
          <RecipeListView
            recipes={visible}
            categories={groupingCategories(categories, state.categories)}
            detail={state.detail}
          />
        )}
      </div>

      {/* Desktop rail (right) */}
      <aside className="hidden md:sticky md:top-4 md:flex md:flex-col md:gap-4 md:self-start">{filters}</aside>
    </div>
  )
}
```

- [ ] **Step 7: Build + run all tests**

Run: `npm run build && npm test`
Expected: PASS. (FilterControls no longer takes `active`/`onClear`; RecipeList no longer passes them.)

- [ ] **Step 8: Visual check (Chrome MCP)**

Confirm: rail is on the right at desktop width; below `md` it collapses and the "Filter" button opens a right-side sheet containing the same controls; search is full-width under the heading; typing shows the `X`, clicking it clears; the count reads `visible / total` and updates live; the search input shows no focus ring.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(list): right rail + mobile filter sheet, full-width search w/ clear, result count"
```

---

### Task 9: FilterControls — restructure (reorder, rename, headings, font, spacing) + collapsible/searchable Tags & Zutaten with tag icons

**Files:**
- Modify: `src/components/list/FilterControls.tsx`

**Interfaces:**
- Consumes: postxl `Collapse, CollapseTrigger, CollapseContent, Input, Badge, Separator, ToggleGroup, ToggleGroupItem`; lucide `ChevronDown`; `TagIcon` from `src/components/TagText.tsx`; `normalizeText` from `src/list/search.ts`.

- [ ] **Step 1: Apply the structural changes**

Make these edits to `FilterControls.tsx` (Zugriff colour/grey-out is Task 10 — leave the Zugriff toggles as-is here except they move *above* "Weitere Filter"):

1. **Larger group headings + bigger spacing.** Update `FilterGroup`:
```tsx
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}
```
2. **Uniform content font.** `FieldLabel` stays `text-sm text-muted-foreground`. Ensure tag/ingredient `Badge`s and role/Freigabe names render at `text-sm` (add `text-sm` where a Badge or label is smaller).
3. **Add a reusable collapsible field** for Tags and Zutaten (default collapsed):
```tsx
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
```
4. **Reorder groups** to: `Kategorien` → `Separator` → `Zugriff` → `Separator` → `Weitere Filter`. Rename the "Verfeinern" group title to **`Weitere Filter`**.
5. **Tags: searchable + icons.** Add a `tagQuery` state (mirroring `ingredientQuery`) and render Tags inside `CollapsibleField`. Each tag badge shows its icon before the name when `t.svg` exists:
```tsx
const [tagQuery, setTagQuery] = useState('')
const filteredTags =
  tagQuery.trim() === '' ? tags : tags.filter((t) => normalizeText(t.id).includes(normalizeText(tagQuery)))
// …inside Weitere Filter:
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
```
6. **Zutaten: collapsible** (keep its existing search input + scrollable badge list, just wrap in `CollapsibleField title="Zutaten" count={state.ingredients.length || undefined}`). Add the focus-ring-off class to its search `Input`.
7. **Maximale Arbeitszeit** stays as left by Task 3 (no Gesamtzeit toggle). Add the focus-ring-off class to its number `Input`. The three sub-fields (Tags, Zutaten, Maximale Arbeitszeit) sit in the group body with `gap-5` between them (set the "Weitere Filter" group body wrapper to `flex flex-col gap-5`, or rely on `FilterGroup`'s `gap-3` bumped — use an inner `<div className="flex flex-col gap-5">`).

Add the imports: `Collapse, CollapseContent, CollapseTrigger` from postxl, `ChevronDown` from lucide, `TagIcon` from `../TagText`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Visual check (Chrome MCP)**

Confirm: group order is Kategorien → Zugriff → Weitere Filter; "Weitere Filter" heading larger; Tags and Zutaten are collapsed by default and expand on click; both have a working search; tags with an svg show their icon before the name; all filter content is one font size; spacing between Tags/Zutaten/Zeit is roomy; filter inputs show no focus ring.

- [ ] **Step 4: Commit**

```bash
git add src/components/list/FilterControls.tsx
git commit -m "feat(list): reorder/rename filter groups, collapsible+searchable tags & ingredients, tag icons"
```

---

### Task 10: FilterControls — Zugriff axis colors, bigger icons, rule-based grey-out

**Files:**
- Modify: `src/components/list/FilterControls.tsx`
- Test: `src/components/list/FilterControls.test.tsx` *(new)*

**Interfaces:**
- Consumes: `ROLE_COLOR`, `COLLAB_COLOR`, `collabDisabled`, `roleDisabled`, `roleAllowsCollab` from `src/list/access.ts`.

- [ ] **Step 1: Write the failing test (grey-out + relax)**

Create `src/components/list/FilterControls.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FilterControls } from './FilterControls'
import { DEFAULT_STATE, type ListState } from '../../list/state'

const baseProps = {
  categories: [],
  onToggleCategory: () => {},
  tags: [],
  ingredients: [],
}

function setup(state: ListState) {
  const set = vi.fn()
  render(<FilterControls state={state} set={set} {...baseProps} />)
  return { set }
}

describe('Zugriff grey-out + relax', () => {
  it('greys impossible Freigabe options once a role is chosen', () => {
    setup({ ...DEFAULT_STATE, role: 'editor' })
    // editor → only Collaborative is valid; Privat + Geteilt greyed
    expect(screen.getByRole('button', { name: /Privat/i }).className).toContain('opacity-40')
    expect(screen.getByRole('button', { name: /Geteilt/i }).className).toContain('opacity-40')
    expect(screen.getByRole('button', { name: /Kollaborativ/i }).className).not.toContain('opacity-40')
  })

  it('relaxes the sister axis when an impossible option is clicked', () => {
    const { set } = setup({ ...DEFAULT_STATE, role: 'editor' })
    fireEvent.click(screen.getByRole('button', { name: /Privat/i }))
    expect(set).toHaveBeenCalledWith({ collab: 'private', role: 'any' })
  })
})
```
Note: postxl `ToggleGroupItem` renders as a `button` whose accessible name includes its text label, so `getByRole('button', { name: /Privat/i })` matches the segment.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/list/FilterControls.test.tsx`
Expected: FAIL — no `opacity-40` / relax logic yet.

- [ ] **Step 3: Rework the Zugriff group**

Replace the Zugriff `FilterGroup` body with colour-driven, bigger-icon segments and rule-based grey-out + relax. Add the access imports at the top:
```tsx
import { ROLE_COLOR, COLLAB_COLOR, collabDisabled, roleDisabled, roleAllowsCollab } from '../../list/access'
```
Zugriff group:
```tsx
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
        const meta = { owner: { Icon: Crown, label: 'Besitzer' }, editor: { Icon: Pencil, label: 'Bearbeiter' }, viewer: { Icon: Eye, label: 'Betrachter' } }[r]
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
        const meta = { private: { Icon: Lock, label: 'Privat' }, shared: { Icon: Share2, label: 'Geteilt' }, collaborative: { Icon: Users, label: 'Kollaborativ' } }[c]
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
```
Greyed items keep their `value` (no `disabled` attr) so they stay clickable and the relax logic fires.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/list/FilterControls.test.tsx`
Expected: PASS.

- [ ] **Step 5: Build + full test run**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 6: Visual check (Chrome MCP)**

Confirm: role/Freigabe icons are noticeably bigger and coloured (owner amber, editor violet, viewer slate; private slate, shared blue, collab green); selecting `Bearbeiter` greys `Privat`+`Geteilt`; clicking a greyed `Privat` selects Privat and resets the role to "Alle"; colours read in both light and dark mode.

- [ ] **Step 7: Format + commit**

```bash
npm run format
git add -A
git commit -m "feat(list): coloured, larger Zugriff icons with rule-based grey-out + relax"
```

---

## Self-Review

**1. Spec coverage** — every spec section maps to a task:
- §1 layout flip + mobile drawer → Task 8. §2 search relocation + X + count → Task 8 (+ ResultCount). §3 group order/headings/font/spacing → Task 9. §4 category toggle buttons → Task 6. §5 Zugriff bigger icons/colors/grey-out → Task 10 (+ access.ts Task 2). §6 collapsible+searchable Tags/Zutaten, tag icons, time simplified → Tasks 9 (+ time in Task 3). §7 always-grouped + group toggle removed → Task 3; icon sort + detail clarity → Task 7. §8 collapsible color-coded groups + vertical line → Task 5. §9 row icons no tooltip + coloured → Task 4. §10 focus ring off → Tasks 8 (search) + 9 (filter inputs). New modules access.ts/palette.ts → Tasks 2/1. State changes → Task 3. Testing → per-task + Tasks 1/2 logic tests + ResultCount + grey-out test.
- **Out-of-scope** items (faceted counts, protocol changes, theme tokens) intentionally have no task.

**2. Placeholder scan** — no `TBD`/`TODO`/"add error handling"/"similar to Task N"; every code step shows full code.

**3. Type consistency** — `colorClasses` returns `{ border, bgActive, text, line, dot }` (used consistently in Tasks 1/5/6). `ROLE_COLOR`/`COLLAB_COLOR` shape `{ icon, activeBg }` used in Tasks 2/4/10. `roleAllowsCollab`/`collabDisabled`/`roleDisabled` signatures match between Task 2 and Task 10. `ListState` after Task 3 (no `group`/`durationField`) is consumed correctly by Tasks 5/7/8/9/10. `RecipeListView` prop `{ recipes, categories, detail }` consistent between Tasks 3/5 and the call site in Task 8. `withinDuration(recipe, max)` consistent in Task 3.

**Note on `colorClasses(color)` when `color` is `null`:** `UserCategory.color` is typed `string` (non-null) in protocol.ts, and uncategorised passes `""` → neutral fallback. No null path.
