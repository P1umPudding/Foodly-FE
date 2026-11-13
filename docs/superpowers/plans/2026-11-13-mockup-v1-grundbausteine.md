# Plan #227 — Mockup-Angleich V1: Grundbausteine

Source: spec.md (incl. Präzisierungen, Nachtrag, Assumptions A1–A10). Mockup values: dir-a.css (tokens), base.css `.seg` (304-329), `.tag` (453-470), screens.css `.fbtn` (2087-2149), `.link-btn` (1414-1435), app.js 285-300, 422, 429.

## Step 1 — Tokens (commit "Add tag, segment, hover and divider tokens")
- `src/styles/theme.css` `:root`: `--tag-bg: oklch(0.95 0 0)`, `--seg-bg: oklch(0.94 0 0)`, `--seg-shadow: 0 1px 2px rgb(0 0 0 / 0.08)`, `--hover: oklch(0.955 0 0)`, `--divider: oklch(0.93 0 0)`.
  `.dark`: `--tag-bg: oklch(0.25 0 0)`, `--seg-bg: oklch(0.25 0 0)`, `--seg-shadow: none`, `--hover: oklch(0.235 0 0)`, `--divider: oklch(0.255 0 0)`.
- `src/styles/styles.css` `@theme inline`: `--color-tag`, `--color-seg`, `--color-hover`, `--color-divider`, `--shadow-seg: var(--seg-shadow)` → utilities `bg-tag`, `bg-seg`, `bg-hover`, `border-divider`, `shadow-seg`.
- `docs/design.md` §2 token table: add the four tokens + seg shadow, replace the "segment switches / tags use bg-muted/bg-secondary" note.
- Verify: build (Tailwind generates the utilities; grep dist CSS for `bg-tag`).

## Step 2 — TagChip + TagChips (commit "Render tags as chips")
- `src/components/TagText.tsx`: add `TAG_ICON_SIZE.xs = 'h-3'` (12 px icon).
- New `src/components/recipe/TagChip.tsx`: `<span>` `inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-[4px] bg-tag px-2 text-[12px] font-medium text-muted-foreground`; content = `<TagIcon tag size="xs" alt="" />` (only when the tag has an svg and it loads — TagIcon's fallback=null gives no placeholder) + the tag name. Name text always visible; icon alt="" (decorative, name next to it). Unknown tag id (not in catalog) → name only.
- `TagChips.tsx`: list of `TagChip`s, `flex flex-wrap items-center gap-1` (mockup `.chips` gap 4px), props `tags`, `max?` (slice), `align`. Drop `hoverName`, `size`, `TagName`, `IconChip`, TooltipProvider. Update header comment (why: Designer-Review 13.11. replaced icon-or-name).
- `RecipeRow.tsx`: `<TagChips tags={recipe.tags} max={2} align="end" />` (both views share the `tags` element). Keep `phone:hidden` and no wrapper without tags.
- `RecipeDetail.tsx:250`: `<TagChips tags={recipe.tags} />`.
- Tests: rewrite `TagChips.test.tsx` (REST mode): chips render name + `bg-tag` class; icon appears once loaded with name still shown; broken icon → name only, no img; tag without svg → no img (no placeholder); `max` caps at 2. New `TagChip.test.tsx` optional (covered via TagChips). `RecipeRow.test.tsx`: detailed + compact show max 2 chips with `bg-tag` (AC1). Detail page test if one checks tags: adjust (grep RecipeDetail tests for hoverName/tag behaviour).

## Step 3 — Segment toggle (commit "Style view toggles as segment track")
- New `src/components/SegmentedToggle.tsx` (shared, basis for the editor "Größe" later): generic `<T extends string>` `{ value, onChange, options: {value,label,Icon}[], ariaLabel }`; icon-only items with postxl Tooltip (as today). ToggleGroup class `gap-0.5 rounded-lg bg-seg p-0.5`; item via `FocusToggleGroupItem` with `h-8 rounded-md px-2.5 text-muted-foreground hover:bg-transparent hover:text-foreground`, selected (JS flag, see existing comment) `bg-card text-foreground shadow-seg hover:bg-card`. FocusToggleGroupItem itself unchanged (DurationFilter).
- `ViewToggles.tsx`: use `SegmentedToggle`; gap between the two groups stays (spacing belongs to issue A). Move the JS-flag comment to SegmentedToggle.
- Tests (`ViewToggles.test.tsx`): track has `bg-seg`; active item `aria-checked="true"` + `bg-card` + `shadow-seg`; inactive has `text-muted-foreground` and not `bg-card` (AC2 per A1). Existing tests stay green.

## Step 4 — Search (commit "Add search icon and new placeholder")
- `SearchInput.tsx`: lucide `Search` icon `pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground` aria-hidden; input `pl-9`. Height unchanged (A5).
- `RecipeList.tsx:240` and `CategoryPage.tsx:198`: placeholder „Rezept oder Zutat suchen“. Popover searches unchanged (A8).
- Tests: `SearchInput.test.tsx` renders an svg icon (`container.querySelector('svg')` hidden, aria-hidden); RecipeList/CategoryPage tests asserting „Suchen…“ updated; one test that the list page search shows the new placeholder (AC3).

## Step 5 — Filter buttons (commit "Filter buttons with icons and mockup states")
- `FilterButton.tsx`: new prop `icon: LucideIcon`. Outer frame `<div>` `inline-flex h-[30px] items-stretch overflow-hidden rounded-md border bg-card phone:h-10`; active `border-border-strong`; open `has-[[data-state=open]]:border-subtle-foreground` (Radix trigger sets data-state=open for popover and sheet).
  Trigger `TriggerButton variant="bare"` (focus ring only) with `inline-flex h-full items-center gap-1.5 pl-2.5 pr-2 text-[13px] font-medium text-muted-foreground hover:bg-hover max-w-56`:
  inactive = `<Icon size-3.5 text-subtle-foreground aria-hidden/>` + label + `ChevronDown size-3.5 text-subtle-foreground`;
  active = `<span text-subtle-foreground>Label:</span> <span truncate max-w-[180px] font-semibold text-foreground>first</span> +n` (no icon, no chevron).
  ✕ = postxl `Button variant="ghost" size="icon"` `h-full w-auto rounded-none border-l px-[7px] hover:bg-hover phone:w-10`, aria-label unchanged `${label} entfernen`, focus handoff unchanged. Focus ring must not be clipped by overflow-hidden → use `focus-visible:ring-inset` on both buttons (check visually).
- `FilterBar.tsx`: pass icons Folder / Tag / ListChecks / Clock / Users; gap `gap-1.5` (6 px).
- `RecipeList.tsx` result row: reset link only when facets are active (new local `facetActive` = filterActive minus search; derive from list state fields categories/tags/ingredients/durationMax/role/collab — reuse a helper if `src/list/state.ts` has one, else add `isFacetActive` next to `isFilterActive` with a unit test), no „·“ separator; style `link-btn`: `variant="ghost" size="sm" h-[26px] px-1.5 text-[12px] font-medium text-muted-foreground hover:bg-hover hover:text-foreground`, `gap-2.5` (10 px) to the count. Keep the invisible-while-loading behaviour on the link itself.
- Tests (`FilterButton.test.tsx`, `FilterBar.test.tsx`): each of the five buttons renders its icon when inactive (AC4: `data-testid`-free check via `svg.lucide-folder` etc. class lucide sets); active shows no facet icon and no chevron, label + value + ✕; open state class on frame. `RecipeList` test: search text alone → no reset link; with a tag filter → link present, no „·“.

## Step 6 — Checks, format, visual check (commit "format" only if needed)
- `npm run build`, `npm test -- --passWithNoTests`, `npm run format`, `npm run format:check`, `npm run lint`.
- Visual: `VITE_MOCK=1` build + preview vs mockup `docs/design/redesign/app.html?theme=light|dark#/list` (and `#/detail`), desktop 1440×900 and phone 390×844; screenshots for the PR (headless Chrome via puppeteer-core in scratch if no Chrome MCP; nothing added to package.json). Screenshots attached to the PR (uploaded via a branch-local `docs/...`? → no: upload as PR comment images is not possible via gh; put them in `docs/design/redesign/audit/screens-227/` only if the owners want them in the repo — default: commit them under `.github`-free path `docs/design/redesign/audit/pr-227/` and reference via raw URL from the PR branch).

## AC mapping
1 → Step 2 tests (RecipeRow detailed/compact, detail via TagChips) · 2 → Step 3 tests · 3 → Step 4 tests · 4 → Step 5 tests · 5 → Step 6 screenshots · 6 → Step 6 checks.

## Out of scope
Row layout/group headers (#229), header (#228), sort menu/heights 38 px/vsep (issue A), popover contents (issue B), mobile sheet (F), editor removable chip (#231).

## Revisions after review pass 1 (override the steps above)
- R1 (B1): dark `--seg-shadow: 0 0 #0000` (not `none`, which invalidates Tailwind's combined box-shadow and kills the focus ring). Visually check focus on the active segment in dark.
- R2 (M1): result row gets a fixed `min-h-[26px] items-center` so the 26 px link-btn can't change the row height / `--list-sticky-top`; update that comment.
- R3 (M2): tests to adapt: `RecipeList.search.test.tsx` (~422-437, search-only now has NO reset link), `FilterButton.test.tsx` (bg-muted asserts), `SearchInput.test.tsx` / page tests with „Suchen…“, `TagChips.test.tsx`. Empty-state „Filter zurücksetzen“ keeps `isFilterActive`.
- R4 (M3): checks = exactly the CLAUDE.md five: `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`, `npm run lint` (plus `npm run format` before). Run `npm ci` first in step 1 (node_modules absent).
- R5 (M4): bare trigger gets `focus-visible:ring-ring focus-visible:ring-inset`; ghost ✕ gets `focus-visible:ring-inset` and `hover:bg-hover dark:hover:bg-hover` (verify postxl ghost classes in node_modules).
- R6 (M5): screenshots are NOT committed. Taken with puppeteer-core installed in $SKAILE_SESSION_SCRATCH (repo package.json untouched). Delivery: try uploading via GitHub (no API for PR image attachments) → fall back to asking the Dispatcher how to deliver; PR body lists what was compared.
- R7 (m1): use the text scale (`text-sm` = 13 px, `text-xs` = 12 px — verify in styles.css) and `rounded-sm` (4 px) instead of arbitrary values.
- R8 (m2): segment `px-3`.
- R9 (m3): search icon `text-muted-foreground`; test queries `svg.lucide-search`.
- R10 (m4): no shared `SegmentedToggle`; keep the segment look inside `ViewToggles.tsx` (YAGNI) — the editor's text segment (#231) can extract it later.
- R11 (m5): PR body states the AC deviations (A1 aria-checked vs aria-pressed; A3 no tile tags).
- R12 (m6): commit the final plan as `docs/superpowers/plans/2026-11-13-mockup-v1-grundbausteine.md` (first commit).
- R13 (nits): comment why `has-[[data-state=open]]` works on FilterButton (trigger not wrapped by Tooltip); ✕ aria-label stays „<Label> entfernen“ on purpose (existing tests/a11y).

## Review log
- Review pass 1 (fresh subagent): 1 blocker, 5 major, 6 minor, 2 nits — all adopted as R1–R13.

## Revisions after review pass 2 (override earlier text)
- R14: active filter "Label:" in `text-muted-foreground` (design.md §2: subtle only for non-text/large text); subtle stays for facet icons, chevron. PR lists this as a deliberate deviation from the mockup.
- R15: reset link also `hover:bg-hover dark:hover:bg-hover`.
- R16: `isFacetActive(categoryState)` in `src/list/state.ts` next to `isFilterActive`, unit-tested; link click still uses the existing clear (also clears search). Only test ~422 in RecipeList.search.test.tsx changes.
- R17: ✕ `text-muted-foreground hover:text-foreground`, `<X className="size-3.5" />`.
- R18: bare trigger: `cursor-pointer`, `shrink-0` on icon/chevron; drop `relative focus-visible:z-10`.
- R19: design.md: also update the `text-subtle-foreground` row (now used: filter icons, chevron, open border) and ghost-hover row (`bg-hover` for filter/link buttons).
- R20: PR states honestly that search (36 px) vs sort (32 px) height parity is deferred to issue A (audit 1.2).
- R21 (AC5): screenshots: try Chrome MCP, fallback puppeteer-core in scratch. Commit PNGs on `agent/issue-227` under `docs/design/redesign/audit/pr-227/`, link via commit-SHA raw URLs in the PR, then remove them in a follow-up commit so they never reach main (squash merge).
- R22: open-state test asserts trigger `data-state="open"` + frame class (jsdom has no `:has`), commented.
- R23: result row spacing `mt-3` stays (spacing → issue A). AC1 test = text + `bg-tag` (noted in PR).

## Review log (cont.)
- Review pass 2 (fresh subagent): 0 blockers, 1 major (subtle label contrast vs design.md), 7 minors, 3 nits — adopted as R14–R23.
