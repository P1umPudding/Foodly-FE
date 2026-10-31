# Plan: #47 Bewertungszahlen mit Dezimalkomma

Basis: spec.md incl. assumptions A1–A6. Smallest change: one pure formatter, four call sites switched over, tests adjusted/added. No new components, no new styling.

## Step 0: Commit the plan
- Copy this plan as `docs/superpowers/plans/2026-10-31-rating-comma.md` (CLAUDE.md: plans live in docs/superpowers/plans; precedent #46). Own commit.

## Step 1: Formatter in `src/api/views.ts`
- New `export function formatRating(value: number): string` → `value.toFixed(1).replace('.', ',')`.
  Placed right after `visibleRating` (rating block). One-line why-comment, e.g. `// Fixed German notation (design.md §8); no Intl, locale switching is a non-goal.`
- The comment "No time/portion formatters here on purpose" stays unchanged (it only covers time/portion and isn't contradicted; corrects A4).
- `views.test.ts` import line will exceed 120 characters → wrap it with prettier right in commit 1.
- Test in `src/api/views.test.ts` (`describe('formatRating')`): 4.5→'4,5', 4→'4,0', 0→'0,0', 5→'5,0', 3.6666→'3,7'.

## Step 2: Switch call sites
- `src/components/recipe/Rating.tsx`: `StarsValue` and `StarValue` → `{formatRating(value)}`; trigger aria-label → `` `Bewertung ${formatRating(value)} von 5` ``. Comment "tabular N.N" → "N,N". Import from `../../api/views` (already imports visibleRating etc. from there).
- `src/components/recipe/RecipeRow.tsx`: local `Rating` → `{formatRating(value)}`; extend the import from `../../api/views`.
- `src/components/recipe/Stars.tsx`: aria-label `Stars` → `` `${formatRating(value)} von 5` ``, `StarMeter` → `` `${formatRating(value)} von ${max}` `` (keep max!) (A1). New import `../../api/views` (components/recipe already imports views elsewhere, no cycle: views.ts imports only types).
- `tabular-nums` stays unchanged everywhere.
- Check: `rg "toFixed\(" src/components` must be empty afterwards.

## Step 3: Tests
- `RecipeRow.test.tsx`: '5.0' → '5,0' (comment `avg (3.0)` → `(3,0)`); new test with `{ ...base, editors: [2], viewers: [], rating: [{user:1,rating:4},{user:2,rating:5}] }` (collaborative, base is only shared) → `getByText('4,5')`, `queryByText('4.5')` null.
- `Stars.test.tsx`: '3.7 von 5' → '3,7 von 5', '3.2 von 5' → '3,2 von 5'.
- `Rating.test.tsx`: NEW test (leave the existing 4/2 test alone): `editors: [2]`, ratings {1:4},{2:5} → popover shows '4,5' (Durchschnitt), '4,0' and '5,0' (rater rows), `queryByText('4.5')` null. Optional in the test "shows the shared collaborative content in the sheet": `within(sheet).getByText('3,0')`. Existing 'Bewertung 4,0 von 5' stays as regression.

## Verification of the acceptance criteria
- AC1: formatter test (step 1) + component tests (step 3: RecipeRow, Rating popover, Stars labels) + `rg toFixed` check.
- AC2: locally `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check` (as CI). Visual check: text-only change, `tabular-nums` unchanged; no Chrome MCP in this environment → covered by component tests, noted in the PR.

## Commits
0. `Plan: Bewertungszahlen mit Dezimalkomma (#47)` (docs/superpowers/plans)
1. `Bewertung: formatRating mit Dezimalkomma in views.ts` (formatter + test)
2. `Bewertungszahlen in Popover, Liste und Stern-Labels mit Komma` (call sites + test adjustments/new tests)
Then `npm run format` before the PR. No Co-Authored-By trailer.

## Review log
- Review pass 1 (fresh subagent): no blocker. Major: commit the plan under docs/superpowers/plans → step 0 added. Minor adopted: views.ts comment stays (A4 corrected), StarMeter keeps `max`, Rating test as a new test with explicit data, collaborative RecipeRow data spelled out. Nits: redundant '.' test dropped, one-line comment, German commit subjects consistently.
- Review pass 2 (fresh subagent): ready to implement, no blocker/major. Minor adopted: prettier on the views.test import in commit 1. Nits adopted: RecipeRow comment (3,0), sheet test referenced by name, PR wording around tabular-nums.
