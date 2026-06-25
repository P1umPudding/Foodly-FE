# Recipe-list overhaul — design

> Status: approved design (brainstorming output). Date: 2026-06-25.
> Branch: `phase-2-organisation-navigation`. Builds on the implemented
> Phase-2 list (search/sort/filter, category grouping, role/collab axes).

A set of layout, interaction, and visual changes to the recipe-list page and its
filter rail. Frontend-only; no protocol changes. All decisions below were
confirmed with the user; the four explicitly-chosen ones are marked **[decided]**.

## Goals

Reorganise the recipe list around a right-hand filter rail, make filtering and
the access model more legible (icons, colors, collapsibles, grey-out), and make
category grouping the permanent, color-coded structure of the list.

## Affected files

| File | Change |
|---|---|
| `src/pages/RecipeList.tsx` | Layout flip (sidebar right), search bar + count moved into content column, mobile drawer wiring, drop `flat` empty-state copy unaffected |
| `src/list/state.ts` | Remove `group`/`GroupView` and `durationField`; always group by category, always work-time |
| `src/components/list/FilterControls.tsx` | Group reorder + rename, larger headings, uniform font, bigger spacing, collapsible Tags/Zutaten, tag search + icons, role/collab colors + grey-out, drop search bar + reset (moved out) |
| `src/components/list/CategorySidebar.tsx` | Checkbox/dot rows → color-coded toggle buttons |
| `src/components/list/ListToolbar.tsx` | Icon-only sort dropdown, clearer detail toggle, remove group toggle |
| `src/components/list/RecipeListView.tsx` | Always grouped; collapsible groups; color-coded headings + vertical line |
| `src/components/recipe/RoleCollabIndicator.tsx` | Remove tooltips; color both role + collab icons |
| `src/list/access.ts` *(new)* | Shared access-color map + role/collab validity (grey-out) rules |
| `src/list/palette.ts` *(new)* | Category-color → Tailwind class-set map (approach A; supersedes the inline `SWATCH`) |
| `src/styles/styles.css` | Only if a `@keyframes`/native-element rule is genuinely needed (not expected) |

## Decisions reference

- **"Verfeinern" → "Weitere Filter"** **[decided]**.
- **Access color-coding on BOTH axes** (Rolle + Freigabe), in the filter and on
  the recipe rows **[decided]**.
- **Sort: 8 icon-only entries** (field icon + direction arrow), narrower
  dropdown **[decided]**.
- **Grey-out: rule-based** per the §D matrix in
  `docs/phases/phase-2-organisation-navigation.md` **[decided]**.
- **Category colors: approach A** — extend a palette map of known hex →
  Tailwind class sets (Tailwind-only, CLAUDE.md-compliant); unknown colors fall
  back to neutral **[decided]**.

---

## 1. Page layout (`RecipeList.tsx`)

- Grid flips to **content-left, rail-right**: `md:grid-cols-[1fr_18rem]`. The
  `<aside>` rail stays `md:sticky md:top-4`.
- **Small screens (`< md`):** the rail is **not** rendered inline. Instead a
  **"Filter" button** (in the toolbar/heading row) opens the rail inside a
  postxl **`Sheet`** (`SheetTrigger`/`SheetContent` from the right). The same
  `<FilterControls>` renders inside the sheet — one component, two mounts via a
  CSS-visibility / conditional approach, or render `FilterControls` once and
  place it in either the aside (md+) or the SheetContent (below md). Prefer
  rendering it once in each container guarded by Tailwind `hidden md:flex` /
  the Sheet; duplication of the element is acceptable since state lives in the
  parent.
- **Content column, top → bottom:**
  1. Heading row: `Rezepte` (`font-display text-3xl`) + **count** + (mobile)
     Filter button. Toolbar moves below or stays right per item 5.
  2. **Search bar — full width**, directly under the heading (see §2).
  3. **Toolbar** (`ListToolbar`), right-aligned (`flex justify-end`).
  4. List / states (loading, error, empty, results).
- The empty-state "Filter zurücksetzen" button **stays** (it's the in-list
  reset; only the rail's separate reset is removed).

## 2. Search bar + count (moved out of the rail)

- Rendered in the content column, **full width** of the list, under the heading.
  Controlled by `state.search`.
- **Clear `X`:** a lucide `X` button inside the input's right edge, shown only
  when `state.search !== ''`, clears to `''`. Use postxl `Input` with a trailing
  button positioned via Tailwind (`relative` wrapper + absolutely-positioned
  button), or postxl's input-with-affix if one exists; do not hand-roll a raw
  `<input>`.
- **The rail's "Zurücksetzen" button is removed** entirely for now.
- **Count** `x/y` shown next to the heading (or directly under search):
  `visible.length` / `allRecipes.length`, e.g. `12 / 47`. Tabular-nums, muted.
  When no filter/search is active it still shows `47 / 47` (always visible).

## 3. Filter rail structure (`FilterControls`)

- **Group order:** `Kategorien` → **`Zugriff`** → **`Weitere Filter`**
  (Zugriff and the renamed Verfeinern are **swapped**).
- **`FilterGroup` heading** enlarged: drop the tiny uppercase style; use
  `text-base font-semibold text-foreground` (was `text-xs uppercase ...`).
- **Uniform content font size:** all filter *content* — tag labels, ingredient
  labels, role/Freigabe names, the time field — render at **`text-sm`**.
  `FieldLabel` stays `text-sm text-muted-foreground`.
- **Bigger spacing** between the sub-fields of "Weitere Filter" (Tags / Zutaten /
  Maximale Zeit): increase the inner gap (e.g. group body `gap-5`/`gap-6` instead
  of relying on default).
- Search bar + reset are **gone from here** (moved per §2).

## 4. Kategorien → color-coded toggle buttons (`CategorySidebar`)

- Replace the `Button + Checkbox + dot` rows with **toggle buttons**:
  - **Inactive:** transparent/neutral background, **border in the category
    color**, label in foreground.
  - **Active:** the button takes the **category color as a tint** (hue-filled
    background, e.g. `~/15` of the color, color border, readable text).
- Colors come from `palette.ts` (approach A): `colorClasses(category.color)`
  returns `{ border, bgActive, text, line }` literal Tailwind class strings.
  Unknown hex → neutral set.
- Keep the recipe count per category (tabular-nums, muted).
- Multi-select (OR) semantics unchanged.

## 5. Toolbar (`ListToolbar`)

- **Sort dropdown — 8 icon-only entries** **[decided]**. Each entry = a **field
  icon** + a **direction arrow**, no text:
  - Name: `ArrowDownAZ` / `ArrowUpAZ` (lucide) — or field icon `AArrowDown`/text
    glyph + `ArrowUp`/`ArrowDown`. Pick the clearest lucide pair.
  - Arbeitszeit (`work`): `Clock` + `ArrowUp`/`ArrowDown`.
  - Gesamtzeit (`overall`): `Clock`/`Timer` + arrow (sort keeps `overall`; only
    the *time filter* drops Gesamtzeit, not sort).
  - Bewertung (`rating`): `Star` + arrow.
  - `SelectTrigger` width reduced (e.g. `w-auto`/`w-16`), showing the current
    pair as icons. Keep `aria-label`s on items for accessibility (no visible
    text). Add a postxl `Tooltip` per item only if it reads ambiguously — not
    required.
- **Detail toggle** (`detailed`/`compact`): **clearer active indication** — show
  the active option's **label as text** next to its icon (active item expands to
  icon + word; inactive stays icon-only), or a strong `data-[state=on]` tint +
  label. Goal: at a glance you can tell which view is on.
- **Group toggle removed** (flat/by-category gone — see §7).

## 6. "Weitere Filter": Tags & Zutaten collapsible + searchable; time simplified

- **Tags:**
  - Wrap in a postxl **`Collapse`** (`CollapseTrigger` shows "Tags" + a
    chevron/count; `CollapseContent` holds the body). **Default collapsed.**
  - Add a **search input** ("Tag suchen…") filtering tags by `normalizeText`,
    mirroring the existing ingredient search.
  - Each tag badge shows its **icon before the name** when `tag.svg` exists:
    `<TagIcon hash={tag.svg} alt={t.id} size="sm" />` + name; text-only when no
    svg. Badge selected/unselected styling unchanged (`default`/`secondary`).
- **Zutaten:**
  - Wrap in the same **`Collapse`** pattern (trigger + chevron). **Default
    collapsed.** Keep the existing search input and scrollable badge list inside
    the content.
- **Maximale Zeit:**
  - **Remove the Arbeitszeit/Gesamtzeit toggle** — filter **always uses
    Arbeitszeit** (`work`). Keep `≤` prefix + minutes `Input`.
  - Remove `durationField` from `ListState` and from `filterRecipes` (always
    compare `workMinutes`).

## 7. Always group by category (`state.ts`, `RecipeListView`, `RecipeList`)

- **Remove `GroupView` and `state.group`** from `state.ts`, `DEFAULT_STATE`,
  url/persistence serialisation, and `ListToolbar`. The list is **always
  grouped by category**.
- `RecipeListView` drops the `group` prop and the `flat` branch; always renders
  the grouped layout (categories ordered by `order`, "Ohne Kategorie" last).

## 8. Category-grouped list visuals (`RecipeListView`)

- **Collapsible groups:** each category section is a postxl `Collapse` (or a
  button-toggled section). Header click expands/collapses its rows. Default
  **expanded**. Track open/closed per category in local component state.
- **Larger headings** for category groups (e.g. `text-lg font-semibold`,
  not `text-sm muted`).
- **Color-coded heading:** heading text/accent uses the category color
  (`colorClasses(c.color).text`), with a small color dot or the color applied to
  the heading.
- **Vertical color line:** each category's rows sit inside a container with a
  **left border in the category color** (`border-l-2` + `colorClasses(...).line`,
  with left padding), so the active category is obvious while scrolling.
- "Ohne Kategorie" uses the neutral fallback set.

## 9. Recipe rows (`RoleCollabIndicator`)

- **Remove the tooltips** on both access icons (drop `Tooltip`/`TooltipTrigger`/
  `TooltipContent`). Keep `aria-label` for accessibility.
- **Color both icons** via the shared `access.ts` map:
  - Role: owner = amber `#f59e0b`, editor = violet `#8b5cf6`, viewer = slate
    `#64748b`, other = muted.
  - Collab: private = neutral/slate, shared = blue `#0ea5e9`, collaborative =
    green `#10b981` (existing).
- Icon sizes may stay `h-3.5 w-3.5` on rows (the *filter* icons are the ones
  enlarged — §10).

## 10. Zugriff filter: bigger icons, colors, rule-based grey-out (`FilterControls`)

- **Icons much bigger** in the role/Freigabe toggles (e.g. `size-7`/`size-8`,
  up from `size-6`).
- **Colors on both axes** (from `access.ts`), used for the icon tint and the
  active `data-[state=on]` background tint:
  - Rolle: Besitzer amber, Bearbeiter violet, Betrachter slate.
  - Freigabe: Privat neutral, Geteilt blue, Kollaborativ green.
  - All chosen to stay legible in light **and** dark mode (mid-500 hues read on
    both; verify contrast during build).
- **Rule-based grey-out** **[decided]** from the §D validity matrix (6 of 9
  valid):

  | Rolle ↓ \ Freigabe → | Private | Shared | Collaborative |
  |---|---|---|---|
  | owner | ✅ | ✅ | ✅ |
  | editor | ❌ | ❌ | ✅ |
  | viewer | ❌ | ✅ | ✅ |

  - When a role is selected, **impossible Freigabe options are greyed**
    (`editor` → Private+Shared greyed; `viewer` → Private greyed). Symmetrically,
    a selected Freigabe greys impossible roles (`private` → editor+viewer;
    `shared` → editor).
  - Greyed options **stay clickable**. Clicking a greyed option applies
    **"last click wins":** set the clicked axis to that value and **relax the
    sister axis to `any`** (per the phase-2 doc — no intent-guessing, no dead
    ends).
  - Grey = *logically* impossible only. (Faceted "0 results" counts are out of
    scope, per the phase-2 doc.)
  - Implement validity as pure helpers in `access.ts`:
    `roleAllowsCollab(role, collab)` / `isCollabPossible(collab, role)` /
    `isRolePossible(role, collab)`, driven by the matrix.

## 11. Inputs: focus ring off

- Disable the focus ring on the filter/search inputs (search, tag search,
  ingredient search, minutes): add `focus-visible:ring-0
  focus-visible:ring-offset-0` to each (or a shared wrapper class). Scope to
  these inputs — not a global postxl override.

## New modules

### `src/list/access.ts`
Single source for access visuals + validity:
- `ROLE_COLOR: Record<Role, { icon: string; activeBg: string }>`
- `COLLAB_COLOR: Record<Collaboration, { icon: string; activeBg: string }>`
  (literal Tailwind classes, e.g. `text-[#f59e0b]`, `data-[state=on]:bg-[#f59e0b]/15`).
- Validity helpers per the §10 matrix.
Consumed by `FilterControls` and `RoleCollabIndicator`.

### `src/list/palette.ts`
Approach A category palette:
- `colorClasses(hex: string): { border, bgActive, text, line }` with a literal
  map for the known palette (`#e11d48`, `#0ea5e9`, `#f59e0b`, `#10b981`, plus any
  others in the mock data) → full Tailwind class sets; neutral fallback for
  unknown. Replaces the inline `SWATCH` in `CategorySidebar`.

## State changes (`state.ts` + wiring)

- Remove `group: GroupView` and the `GroupView` type.
- Remove `durationField` and its uses (`'work' | 'overall'`).
- `state.ts`: update `DEFAULT_STATE`, `clearedState`; `isFilterActive` no longer
  references `durationField` (it never referenced `group`).
- `url.ts`: drop the `GroupView` import, the `GROUPS` const, and the `group` +
  `dfield` lines in both `toSearchParams` and `fromSearchParams`.
- `useListState.ts`: remove `'dfield'` and `'group'` from `OUR_KEYS`.
- `filter.ts`: `withinDuration` drops its `field` param and always reads
  `recipe.workMinutes`; `filterRecipes` calls it without `state.durationField`.
- `persistence.ts`: no change needed (it spreads `Omit<ListState,'search'>`);
  stale `group`/`dfield` keys in old localStorage are harmless (ignored on
  `{ ...DEFAULT_STATE, ...persisted }` merge in `useListState`).

## Implementation notes (non-obvious)

- **Sort trigger is icon-only:** Radix `SelectValue` renders the selected item's
  *text*; with icon-only `SelectItem`s the trigger would be empty. Render the
  current `(sortKey, sortDir)` pair's icons **directly inside `SelectTrigger`**
  (not via `SelectValue`). Each `SelectItem` keeps an `aria-label` for a11y.
- **Search clear `X`:** postxl `Input` has no affix slot — wrap in a `relative`
  container, add right padding to the input (`pr-9`), and absolutely-position a
  ghost icon `Button` with the `X`.
- **Collapsibles:** `Collapse` is Radix Collapsible — default-collapsed =
  omit/`defaultOpen={false}` (Tags, Zutaten); default-expanded =
  `defaultOpen` (category groups). Category open/closed is local component
  state keyed by category id.
- **Category active tint via literal classes:** `bg-[#e11d48]/15`,
  `border-[#e11d48]`, `text-[#e11d48]`, `border-l-[#e11d48]` are all literal, so
  the v4 scanner keeps them — store the full set per hex in `palette.ts`.

## Testing

Concrete test edits (verified call sites):
- `src/components/list/RecipeListView.test.tsx:41` — remove the `group=` prop.
- `src/list/state.test.ts:22,28` — remove the `group` field/assertion.
- `src/list/url.test.ts:15,22` — remove `durationField` and `group` from the
  round-trip fixture.
- `src/list/filter.test.ts` — drop `durationField` from any literal `ListState`
  it constructs (spread `DEFAULT_STATE` instead where possible).
- `src/components/recipe/RoleCollabIndicator.test.tsx` — keeps working as-is
  (assertions use `getByLabelText`; we keep the `aria-label`s). Simplify by
  dropping the now-unneeded `TooltipProvider` wrapper.
- Add unit tests for `access.ts` validity helpers against the §10 matrix
  (all 9 cells) and the relax-on-click behaviour.
- Add a test for the `x/y` count (matching/total).
- `npm run build` (tsc + vite) must pass; `npm run format` before the PR.

## Out of scope (explicitly)

- Faceted live counts on filter options ("0 results" badges) — deferred per the
  phase-2 doc.
- Backend/protocol changes.
- Light/dark *token* additions in `theme.css` (the access/category colors are
  fixed hues reused across both modes via literal classes, not theme-able
  tokens).

## Risks / notes

- Approach A means a **new category color** outside the known palette renders
  neutral until added to `palette.ts`. Acceptable today (fixed mock palette);
  flagged for when the real backend supplies arbitrary colors (would then want
  the CSS-variable bridge noted in the old `SWATCH` comment).
- Verify chosen role colors (amber/violet/slate) have adequate contrast in light
  mode during implementation; adjust hue/shade if any reads weakly.
