# Plan: #46 Bewertung am Handy als Bottom-Sheet, 40-px-Sterne

Facts checked in node_modules (@postxl/ui-components 1.8.2): `size="icon"` = `size-9` (36 px), `iconSm` = `size-7.5`.
`SheetContent` renders its own ✕ (`SheetPrimitive.Close`, sr-only label "Close"). Repo precedent for 40 px: `size-10`
(`DeleteRecipeButton.tsx`, `RecipeDetail.tsx`).

## Step 0 — Plan doc
- Copy this plan to `docs/superpowers/plans/2026-10-31-rating-sheet.md` (earlier pipeline PRs commit their plan there).

## Step 1 — Extract shared content (no behaviour change) (src/components/recipe/Rating.tsx)
- New local component `RatingDetails({ recipe, value, onChange })`: today's PopoverContent children unchanged
  (Durchschnitt row, `<MyRatingInput>`, raters by role). `value` comes from `Rating` (needed there for the trigger
  label); `RatingDetails` computes only `currentUserId`, `collaborative`, `rows`.
- `Rating` renders `<PopoverContent …><RatingDetails …/></PopoverContent>`; markup otherwise identical.

## Step 2 — Phone sheet + layout prop
- Add `layout: 'popover' | 'sheet'` to `RatingDetails` and `MyRatingInput`:
  - `popover`: markup and classes exactly as today (label + stars in one `justify-between` row, `size="iconSm"`).
  - `sheet`: label on its own line, star group below as a full-width row (`flex w-full justify-between`), stars
    `size="icon"` + `className="size-10"` (lib `icon` is `size-9` = 36 px; `cn` drops it), glyph `size-5` (the Button's default svg size overrides `h-*`/`w-*`); „Entfernen“ `h-10`.
  - `role="group"`/`aria-labelledby`, aria-labels, aria-pressed, Entfernen behaviour, error, DemoHint unchanged in both.
- In `Rating`: `const isDesktop = useIsDesktop()`; `const Root = isDesktop ? Popover : Sheet`,
  `const Trigger = isDesktop ? PopoverTrigger : SheetTrigger`; one trigger JSX block with the existing classes,
  aria-label and children (both are plain Radix buttons, no `asChild`).
- Desktop content: existing `PopoverContent` with `<RatingDetails layout="popover">`.
- Phone content: `<SheetContent side="bottom" className="flex max-h-[80vh] flex-col gap-0 rounded-t-lg px-0 pb-[env(safe-area-inset-bottom)]">`
  with handle div (`mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30`, aria-hidden),
  `<SheetHeader className="px-4 pb-3">` + `SheetTitle` „Bewertung“ + sr-only `SheetDescription` „Eigene Bewertung abgeben“,
  then a scroll body `min-h-0 flex-1 overflow-y-auto px-4 pb-4` with `<RatingDetails layout="sheet">`.
- Modal (default Sheet): focus trap, Esc/overlay close, focus back to the trigger. One-line why-comment: modal unlike
  TimerPanel; accepted trade-off that a timer toast isn't clickable while this short form is open. TimerPanel untouched.
  `SheetContent` keeps its default top padding, same as TimerPanel.
- One-line comment on `size-10` (lib icon is 36 px, §7 needs 40). No other comments.

## Step 3 — Tests (src/components/recipe/Rating.test.tsx)
Existing tests run at jsdom's 1024 px = desktop → they cover AC3 and stay unchanged. New
`describe('on a phone')` with `beforeEach(() => setViewport(375))`, `afterEach(() => setViewport(1024))` (only there):
- AC1: `const trigger = screen.getByRole('button', { name: 'Bewerten' })` BEFORE clicking (it gets aria-hidden while
  the modal is open). Click → `getByRole('dialog', { name: 'Bewertung' })` contains a `Close` button (✕). Click ✕ →
  `await waitFor(() => expect(queryByRole('dialog', { name: 'Bewertung' })).toBeNull())` and
  `await waitFor(() => expect(document.activeElement).toBe(trigger))` (Radix restores focus in a setTimeout).
- Boundary: at `setViewport(760)` the trigger opens the sheet as well.
- AC2: every star button in the sheet has class `size-10` and not `size-9`.
- Rating from the sheet: click „4 von 5“ → `setMyRating(5, 4)`, onChange called; Entfernen + Demo hint present.
- Collaborative content in the sheet (Durchschnitt + a role heading) — proves the content is shared.
Desktop guard (outside the phone describe): open at 1024 px → the dialog has `data-slot="popover-content"`; stars
have `size-7.5`, not `size-10`.

## Step 4 — Verify
- `npm run build`, `npm test -- --passWithNoTests`, `npm run format`, `npm run format:check`.
- Visual check with the Chrome MCP only (never the Playwright browser agent), if available: detail page at 375 px light + dark (sheet, handle, ✕, star row) and at
  1280 px (popover unchanged). If no browser in this container, state that in the PR.

## Commits
1. `docs: plan for rating bottom sheet (#46)` (step 0)
2. `refactor(rating): extract shared rating details` (step 1, no behaviour change)
3. `feat(rating): open rating as bottom sheet on phones with 40 px stars` (step 2 + step 3 tests)
4. formatting fix-up only if prettier changes anything.
No `Co-Authored-By` or other AI trailer in any commit (CLAUDE.md overrides harness defaults).

## Out of scope (mention in PR)
The trigger (~24 px tall) and the lib's ✕ stay under 40 px; also PortionScaler's
`iconSm` buttons; the ✕'s label is the lib's English "Close" (same as TimerPanel). Modal sheet blocks timer toasts
while open (accepted trade-off). Suggest a follow-up issue in the PR text instead of widening this PR (#47 also touches Rating.tsx).

## AC mapping
1 → phone dialog test. 2 → size-10 class test. 3 → unchanged existing tests + desktop guard test. 4 → local CI commands.

