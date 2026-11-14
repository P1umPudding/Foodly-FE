# Plan #229 — Mockup-Angleich V3: Rezeptzeilen und Gruppenköpfe

Spec: .git/agent-work/spec.md (assumptions A1–A12). Copy of this plan goes to
`docs/superpowers/plans/2026-11-14-mockup-v3-rezeptzeilen.md` (repo convention, like #227).

## Step 1 — Zeitformat (A1)
- `src/api/views.ts`: `formatMinutes(min: number | null): string | null` → "45 min", "1 h", "1 h 30 min"; null/≤0/NaN → null.
  Plus `listTime(recipe)` = `formatMinutes(recipe.overallMinutes)` (no fallback to `recipe.time`).
- Test `src/api/views.test.ts` (or existing file): 45, 60, 90, 125, 0, null (AC2).
- Commit: "Listen-Zeit als Gesamtzeit (formatMinutes)".

## Step 2 — Detaillierte Zeile (RecipeRow, A7–A9)
- Drop postxl `Card`; the `Link` itself is the row: `flex items-center gap-3.5 rounded-md px-3 py-2.5 transition-colors hover:bg-hover`.
  No border utility, no bg, rows without spacing (list `space-y-0` / plain div).
- Thumb (only `showImages`): 48 px `size-12 rounded-lg` (r-photo 8 px), unchanged rule §1.5. Remove `min-h-12` on text column.
- Text column: title `truncate font-medium` (500, 14 px). ONE meta line `data-testid="recipe-meta"`:
  `flex items-center gap-x-3 text-sm text-muted-foreground whitespace-nowrap min-w-0` with order
  Zeit (Clock icon + formatMinutes) → ★ RatingMeta → „von <Name>“ (only foreign recipes, `useUser(recipe.owner)`,
  `truncate min-w-0`, time/rating `shrink-0`).
- Right side in ONE row, vertically centred: Tags (`phone:hidden`, max 2) → Zugriff → Punkte.
- Tests (RecipeRow.test.tsx): no `border` class on row link / no Card; exactly one `recipe-meta`; order time before rating;
  "von Name" for foreign recipe, absent for own; 90 min → "1 h 30 min"; no raw `time` string (AC1, AC2).

## Step 3 — Kompakte Zeile
- `px-3 py-1.5 gap-3 rounded-md hover:bg-hover`, `touch:min-h-10` (§7). Name 14 px (text-base, font-medium) shrinks first
  (`min-w-0 shrink truncate`, keep CompactName tooltip); then ★, then time muted without clock icon, `shrink-0 whitespace-nowrap`
  (A8, audit 4.4). Spacer; right: Tags → Zugriff → Punkte (audit 4.3). List spacing none (mockup rows are flush).
- Tests: order of right-side elements, no clock icon, time "1 h 30 min".

## Step 4 — Kacheln (A2, A3, A6)
- `RecipeTile`: time = formatMinutes(overallMinutes) with clock icon; meta stays Zeit → ★ → von → Zugriff, `whitespace-nowrap`
  on time so it never breaks (audit 4.7). Affects Home tiles too (note #230 in PR).
- `TileGrid`: new prop `dense` (list only): `minmax(190px,1fr)`, `gap-x-4 gap-y-6`; default stays 230/20/28 (category page, home, skeleton default).
  Grouped tiles get `pt-1.5 pb-1` (mockup `.lgroup .cgrid` padding 6 0 4). RecipeListView passes `dense` when `grouped`… → decision:
  pass `dense` from RecipeListView whenever it renders the list page; add prop `denseTiles` on RecipeListView set by RecipeList page only.
  ListSkeleton's TileGrid gets the same flag on the list page.
- Tests: TileGrid class contains `minmax(190px` with dense; RecipeTile shows "1 h 30 min".

## Step 5 — Gruppenkopf + Linie (RecipeListView)
- Head container: `sticky top-[var(--list-sticky-top,var(--site-nav-h))] z-20 flex h-8 items-center justify-between gap-2 bg-background
  touch:h-10 group/head` (A4). Groups `space-y-4` (16 px) instead of 6; body follows head directly.
- Trigger (postxl Button ghost asChild CollapseTrigger): chevron, dot (`size-2 rounded-full bg-cat-dot ml-0.5`, only when categoryId !== null,
  `data-testid="group-dot"`), name `text-sm font-semibold text-foreground` (collapsed: `group-data-[state=closed]/cat:font-medium
  group-data-[state=closed]/cat:text-muted-foreground`), count `text-sm text-muted-foreground tabular-nums`. Remove `text-cat-ink`.
- „Öffnen ›“: `text-xs font-medium text-muted-foreground`, `opacity-0 group-hover/head:opacity-100 focus-visible:opacity-100
  touch:opacity-100 phone:opacity-100`, `touch:h-10` (A5).
- `GroupIndent`: `ml-[7px] border-l-2 pl-3`, colour `border-cat-dot`; uncategorised → `border-border` (new prop `neutral`; CategoryGroup passes
  `neutral={categoryId === null}`); `lineless` unchanged. „Ohne Kategorie“ ordering/collapse unchanged (grouping.ts untouched).
- Tests (RecipeListView.test.tsx): dot present for category groups, absent for „Ohne Kategorie“; name element lacks `text-cat-ink`
  and has `text-foreground` (AC3); line class `border-cat-dot` vs `border-border`.

## Step 6 — Skeleton + Docs
- `ListSkeleton`: rows spacing to match flat rows only if trivial (space-y-3 → none / bar shapes stay) — A10; otherwise leave.
- `docs/design.md`: §2 table rows: row hover `bg-hover`, group line `--cat-dot`, `border-divider` note (no row dividers in V3); keep short.
- Plan copy in docs/superpowers/plans/.

## Step 7 — Checks & screenshots
- `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`, `npm run lint`.
- Screenshots via headless Chrome from scratch dir (no project deps): app (VITE_MOCK=1 dev/preview) vs mockup
  (`python3 -m http.server` in docs/design/redesign, `app.html?theme=light|dark#/list` and `#/category`),
  desktop 1440×900 + phone 390×844, light/dark. AC4 checked on phone shots (tags hidden, meta one line, tap height measured via JS ≥40 under touch emulation).
  Committed in one commit under `docs/design/redesign/audit/pr-229/`, removed in the next commit (like PR #258), raw links in PR.

## AC mapping
AC1 → Step 2 tests. AC2 → Step 1 + Step 2 tests. AC3 → Step 5 test. AC4 → screenshots + touch emulation measure. AC5 → Step 7. AC6 → Step 7.

## Commits
1 formatMinutes · 2 detailed row · 3 compact row · 4 tiles/grid · 5 group head · 6 skeleton+docs · 7 format · (screenshots add/remove in PR step).

## Revisions after review pass 1 (binding, override the steps above where they differ)
R1 (Step 1) No `listTime` wrapper; call `formatMinutes(recipe.overallMinutes)` directly. Time spans get `tabular-nums` in all views.
R2 (Step 2) RecipeRow.test mock gains `useUser: (id) => users[id]` with a foreign user 2 for the „von <Name>“ case. Row link gets
   `outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`. Title drops `leading-tight`/`pb-0.5` and that comment.
   Tag wrapper `flex-nowrap` so chips never wrap in the single right row (check TagChips; add a `nowrap` class on wrapper/prop if needed).
R3 (Step 4) One prop: `denseTiles` on RecipeListView → `TileGrid dense`; RecipeList page passes it, also into `ListSkeleton`/`LoadMoreSkeleton`
   (LoadMoreSkeleton: 5 tiles when dense, comment updated). CategoryPage/Home stay at 230. Update RecipeTile.test fixture `overallMinutes: 45`.
R4 (Step 5) Update existing RecipeListView tests (`text-cat-ink` assertion → name span `text-foreground` + no `text-cat-ink`; `.border-cat-line` → `border-cat-dot`).
   Trigger fills the head height (`self-stretch` / `h-full`) so touch tap target is 40 px; „Öffnen“ Button `touch:h-10`, verify the
   Button merges `text-xs` over its own size (twMerge) after npm ci. Chevron `text-subtle-foreground` (design.md allows subtle for chevrons
   — verify token name), trigger `hover:text-foreground`; collapsed muted/500 classes on the name span. Remove `mb-2` from head;
   groups `space-y-4`.
R5 (Step 6) ListSkeleton detailed rows: flat `rounded-md`, height ≈ new row height, no spacing (just do it). design.md: update line ~48
   (`border-divider` „ab V3 #229“ → not used by rows), ~52 table (`border-cat-line` → `border-cat-dot`), §4 ~160 („2-px-cat-line“), row hover
   `bg-hover`.
R6 Commits without any Co-Authored-By/AI trailer (CLAUDE.md). Screenshots via headless Chrome from scratch dir, nothing in package.json.

## Review log
- Review pass 1 (fresh subagent): 0 blocker, 4 major, 7 minor, 6 nit. All majors and sensible minors folded into R1–R6.

## Revisions after review pass 2 (binding)
S1 Screenshots/AC4: install puppeteer (bundled Chrome) in $SKAILE_SESSION_SCRATCH (outside repo), drive via CDP: viewport 1440×900 and 390×844 (isMobile+hasTouch, emulate `pointer: coarse` via `Emulation.setEmitTouchEventsForMouse`/media feature emulation), measure tap heights via getBoundingClientRect. Nothing in package.json.
S2 Keep thumbnail classes `h-12 w-12` (existing tests match `/\bh-12 w-12\b/`).
S3 Step 1: rewrite the `views.ts:182` comment (minutes now formatted for list display; detail keeps `recipe.time`).
S4 design.md: also line ~42 (`bg-accent` row hover → rows use `bg-hover`), add group-head chevron to allowed `text-subtle-foreground` uses (~46).
S5 LoadMoreSkeleton dense: `pt-6` instead of `pt-7`, 5 tiles, comment updated; phone values unchanged.
S6 PR notes: recipes with only legacy `time` text show no time in the list (A1) — flag to owners in PR.
S7 Compact row: `py-[7px]` → 34 px like the mockup.
S8 TagChips: opt-in `nowrap` prop (detail page unaffected).
S9 Detailed meta `mt-0.5`. „Öffnen ›“ keeps text ›, as today (deliberate). Ignore the abandoned "passes dense when grouped" text in Step 4; R3 rules.
- Review pass 2 (fresh subagent): 0 blocker, 2 major (no Chrome for screenshots/touch emulation; thumbnail class tests), 6 minor, 3 nit → S1–S9.
