# Plan: #58 tap targets of at least 40 px (Rating trigger, PortionScaler)

The change is CSS classes only. There are no new components, hooks or routes, and nothing in src/api changes. Desktop classes stay untouched (spec A1). Breakpoint: `max-[760px]:`, as in the repo convention and the issue text (Tailwind v4 compiles it to `width < 760px`, so at exactly 760 px the targets stay desktop-sized while the sheet already shows). This is the same gap as the existing 40 px header buttons in RecipeDetail. To keep the header consistent it stays, and the PR names it as a known gap, with a follow-up suggestion to move all `max-[760px]` uses to `max-[761px]` in one go.

**Class assertions:** jest-dom is not installed, so `toHaveClass` is not available. Use `el.classList.contains(token)` (exact token, as in `App.pageTitle.test.tsx`), never `className.toContain`: substring matching would make negative checks such as "no `min-h-10`" fail on `max-[760px]:min-h-10`.

## Assumptions
- A1: Both elements switch size via CSS `max-[760px]:` classes, not `useIsDesktop()` branching. The desktop classes stay byte-for-byte as they are (AC2 holds by construction, no re-render on resize). PortionScaler keeps `size="iconSm"` (30 px) and gets `max-[760px]:size-10` (40 px). That is the same box as `size="icon"` + `size-10` from the spec, because `size-10` overrides the lib size either way.
- A2: The touch target grows without changing the layout height (spec: "Zeile darf nicht sichtbar springen", read against today's layout).
  - Rating trigger: `max-[760px]:min-h-10` plus `max-[760px]:-my-2`. It is about 24 px today, so the layout box stays 24 px.
  - Stepper pair: 40 px against the 32 px `sm` toggles in the same row, so `max-[760px]:-my-1` keeps the row at 32 px.
  - Width: the trigger's stars are about 100 px wide, so its width is already above 40 px.
- A3: The portions steppers are nudged up with `-translate-y-3` in `src/pages/RecipeDetail.tsx`. On phones the larger hit area would then overlap the portion box above by about 4 px. Below 761 px that nudge becomes `max-[760px]:-translate-y-2`, so the targets touch the box but don't overlap it. Desktop keeps `-translate-y-3`. This is a 4 px mobile adjustment, not a header redesign (the non-goal).
- A4: AC1 is tested through classes only, at `setViewport` 375 vs 1024 px where relevant. jsdom applies no CSS, so the class tokens are checked exactly (for example `max-[760px]:size-10`).
- A5: Disabled minus keeps the lib's disabled styling. Only size and margin change, so no colour or theme work is needed for light/dark.


## Step 1: Rating trigger (`src/components/recipe/Rating.tsx`)
- Append `max-[760px]:min-h-10 max-[760px]:-my-2` to the Trigger className.
  - `items-center` already centres the stars.
  - The negative margin keeps the layout box at about 24 px, so meta row 1 does not jump.
- Extend the existing comment above the trigger by one why-line: 40 px tap target (design.md §7), and the negative margin keeps the row height.
- Tests (`Rating.test.tsx`):
  - One assertion in each existing describe, querying the trigger (`getByRole('button', { name: /Bewert/ })`) before any click, while it is the only match:
    - desktop (1024 px, PopoverTrigger): `classList` contains `max-[760px]:min-h-10` and `max-[760px]:-my-2`, still contains `px-1.5` and `py-0.5`, and does not contain `min-h-10` (AC2).
    - phone (375 px, SheetTrigger): same tokens.

## Step 2: PortionScaler steppers (`src/components/recipe/PortionScaler.tsx`)
- Both − and + Buttons already share an identical className. Move it into one const, `stepperClass = 'rounded-md text-muted-foreground hover:text-foreground max-[760px]:size-10'`, with the why-comment once on the const. Both keep `size="iconSm"`.
- The `steppers` wrapper div gets `max-[760px]:-my-1`. This applies to both `steppers` and `full`, since both render in row 2 next to the 32 px `sm` toggles. Net effect: the row height stays the same (A2).
- Tests (`PortionScaler.test.tsx`, new describe "tap targets"):
  - In portions mode (`part="steppers"`) and in multiplier mode (`full`), both buttons ("Weniger" and "Mehr") have `max-[760px]:size-10` and still have `size-7.5` (AC2), checked with `classList.contains`.
  - The wrapper (`getByRole('button', { name: 'Weniger' }).parentElement`) has `max-[760px]:-my-1`, with a short why-comment: it guards the row height.
  - No separate disabled test: the class is static.

## Step 3: Mobile nudge (`src/pages/RecipeDetail.tsx`)
- Portions mode: the steppers wrapper has `-translate-y-3 translate-x-2` and gets `max-[760px]:-translate-y-2` (A3). This stops the 40 px hit area from overlapping the portion box. Both classes survive `cn`, and the media rule wins.
- Multiplier mode (`-translate-y-1.5`) stays unchanged. With `-my-1` the top of its hit area sits about 10 px above the row, inside the 12 px `gap-y-3`, so it does not overlap the sizeText above.
- Extend the existing comment by half a sentence.
- No test: this is a pure layout nudge and jsdom has no layout.
- Mention in the PR: on phones the portions stepper icons sit 4 px lower than today.

## Step 4: Docs
- Commit the plan as `docs/superpowers/plans/2026-10-31-tap-targets-mobile.md`, as in CLAUDE.md (Agent-Pipeline) and like `2026-10-31-rating-sheet.md`. It holds the goal, the assumptions A1–A5 and the steps.

## Step 5: Verify
- Commands: `npm ci` (node_modules is missing), `npm run build`, `npm test -- --passWithNoTests`, `npm run format`, `npm run format:check`.
- Visual check through the Chrome MCP if available (never Playwright, per CLAUDE.md). Recipes: one in portions mode and one in multiplier mode. Viewports: 375 px and 1024 px, light and dark. Look at:
  - row heights
  - no overlap between the steppers and the box
  - the hover and focus state on the taller trigger (the 40 px ring and background overlap neighbouring content through `-my-2`; acceptable)
  - the portions stepper icons 4 px lower
  - desktop identical to today
- If the Chrome MCP is not available, say so in the PR.

## AC mapping
- AC1: the class tests in Steps 1 and 2.
- AC2: the diff only adds `max-[760px]:` tokens, and desktop class assertions on the trigger and steppers (`size-7.5`, `px-1.5`/`py-0.5`).
- AC3: the Step 5 commands are the same as CI.

## Commits
No `Co-Authored-By` or other AI trailer (CLAUDE.md overrides harness defaults). Subjects are in German like the git history (which wins over the English subjects in older plan files), ending with `(#58)`:
1. `Plan: Tippflächen ≥ 40 px am Handy (#58)`
2. `Bewertungs-Trigger am Handy mit 40-px-Tippfläche (#58)`
3. `PortionScaler-Knöpfe am Handy 40 × 40 px (#58)` (includes the RecipeDetail nudge)
4. if needed: `Formatierung`

