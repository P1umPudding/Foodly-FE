# Plan #72: scale fractions and ranges in scaleAmount, flag unscalable amounts

Base: origin/main 880d0e0, branch agent/issue-72. Spec: spec.md (incl. worker assumptions A1–A7).

## Step 1: amount parser + scaleAmount + isScalableAmount (src/api/views.ts)
- Private helpers next to `scaleAmount`:
  - `UNICODE_FRACTIONS: Record<string, number>` for ½ ⅓ ⅔ ¼ ¾ ⅕ ⅖ ⅗ ⅘ ⅙ ⅚ ⅐ ⅛ ⅜ ⅝ ⅞ ⅑ ⅒ (A3).
  - `parseQuantity(s: string): number | null` for one value (trimmed): decimal `^(\d+([.,]\d*)?|[.,]\d+)$` (keeps '.5' and '5.' scalable like the old Number() path; '+2', '1e2', '0x10' are dropped on purpose); Unicode fraction with optional leading integer and optional space (`1½`, `1 ½`, `½`); slash fraction `\d+\s*/\s*\d+` with optional leading integer + at least one space (`1/2`, `1 / 2`, `1 1/2`; '11/2' stays eleven halves); denominator 0 → null. The leading part of a mixed number is whole digits only ('1,5½', '½1' → null). Anything else → null (no sign, exponent, hex, Infinity).
  - `parseAmount(amount: string)`: trimmed; either one quantity → `{ values: [n] }`, or range `^(.+?)(\s*[-–]\s*)(.+)$` where both sides parse → `{ values: [a, b], separator }` (separator keeps the dash and the spacing, A2). Otherwise null. A leading dash ("-2") fails because the left side is empty; "1--2"/"1-" fail because a side does not parse.
  - Exact patterns: decimal `^(\d+([.,]\d*)?|[.,]\d+)$`; slash `^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$`; Unicode `^(?:(\d+)\s*)?([<fractions>])$`; range `^(.+?)(\s*[-–]\s*)(.+)$`.
  - `formatScaled(n)`: existing rounding (Math.round ×100 /100, comma), used for both range ends; no own comment block.
- `scaleAmount(amount, factor)`: unchanged signature (`string | null`). null → null; factor 1 → input as-is; empty/whitespace → input; parse fails → input; else the formatted value or `a + separator + b`.
- New export `isScalableAmount(amount: string | null): boolean`: true when it parses. Uses the same parser as scaleAmount (A4). Callers check "non-empty and not scalable" for the hint.
- Replace the comment above scaleAmount with 2–3 lines of why (prefix/unit live elsewhere; strict parser on purpose; factor-1 identity); drop the stale `Number('')` remark.

Tests (src/api/views.test.ts, extend `describe('scaleAmount')`, new `describe('isScalableAmount')`):
- AC1: ½×2→'1', '1/2'×3→'1,5', '1½'×2→'3', '1 1/2'×2→'3', '1 ½'×2→'3', ⅓×2→'0,67', ¾×2→'1,5'.
- AC2: '1-2'×2→'2-4', '1–2'×1.5→'1,5–3', '½-1'×2→'1-2', '½–1'×2→'1–2', '1 - 2'×2→'2 - 4', '1,5-2.5'×2→'3-5', '1½-2½'×2→'3-5', '1 1/2-2'×2→'3-4', '1 / 2'×2→'1', '.5'×2→'1', '5.'×2→'10'.
- AC3: existing cases stay; factor 1 returns '½', '1-2', '1 1/2', 'etwas' unchanged.
- AC4: unrecognised unchanged: 'etwas', '1 Dose à 400', '-2', '1-', '1--2', '1/0', '1e2', '1—2' (em dash), '1,5½', '½1', '1⁄2' (U+2044, accepted as unrecognised).
- Pinned deliberate edge results: '1 1 / 2'×2→'3' (mixed number); '2 -1/2'×2→'4 -1' (read as range 2 to ½, A5).
- isScalableAmount true for '2', '½', '1 1/2', '1-2'; false for these plus null, '', '  '.

Commit: "Portionieren: Brüche und Bereiche in scaleAmount skalieren (#72)", including this plan as docs/superpowers/plans/2026-11-01-scale-fractions-ranges.md (CLAUDE.md docs convention).

## Step 2: "nicht skaliert" hint (src/components/recipe/IngredientLine.tsx)
- `const unscaled = factor !== 1 && Boolean(line.amount?.trim()) && !isScalableAmount(line.amount)`.
- In the name cell after `<TagText value={name} />`: `{unscaled && <span className="ml-2 text-xs text-muted-foreground">nicht skaliert</span>}` (A1; plain text, so screen readers read it; dims with the row when ticked).
- Test setup: only the `useTags` mock is needed (no `{tag}`s rendered), not the VITE_MOCK stub or fetch mocks from TagText.test.tsx.
- No change to SectionBlock/RecipeDetail/PortionScaler (keeps clear of #71, which works on PortionScaler).

Test: new src/components/recipe/IngredientLine.test.tsx (vitest + Testing Library). Mock `../../catalog/CatalogProvider` `useTags` like TagText.test.tsx; render inside `<table><tbody>`. Cases (AC5):
- 'etwas', factor 2 → hint "nicht skaliert" visible, amount 'etwas' shown.
- 'etwas', factor 1 → no hint.
- '½', factor 2 → shows '1', no hint.
- amount null (free text 'Salz'), factor 2 → no hint.
- amount '  ', factor 2 → no hint.

Commit: "Koch-Modus: nicht skalierbare Mengen als „nicht skaliert“ kennzeichnen (#72)".

## Step 3: verify (AC6)
- `npm ci` first, as CI does.
- All commits: no Co-Authored-By or other AI trailer (CLAUDE.md).
- PR text mentions: hint is struck/dimmed with the row when ticked off; no browser check possible here.
- `npm run build` (tsc + vite = typecheck; there is no lint script in package.json), `npm test -- --passWithNoTests`, `npm run format` then `npm run format:check`.
- Visual check: no browser in this container (A7); state in the PR that light/dark was not checked in a browser. Tokens are theme tokens so both themes are covered by design.
- Before the PR: `git fetch origin main && git rebase origin/main` (#71 runs in parallel and may touch the same area).

## AC → verification
| AC | Verified by |
|----|-------------|
| 1, 2 | views.test.ts scaleAmount cases |
| 3 | existing views.test.ts cases + factor-1 cases |
| 4 | views.test.ts unrecognised cases + isScalableAmount |
| 5 | IngredientLine.test.tsx |
| 6 | build (typecheck), test, format:check (no lint script exists) |

## Review log
- Review pass 1 (fresh subagent): no blockers. Major: plan not in docs/superpowers/plans (fixed: committed with step 1); strict regex dropped '.5'/'5.' (fixed: regex widened, tests added, intentional drops stated). Minor: spaces around slash (fixed), mixed-number shape (fixed + tests), whitespace AC5 case (added), stale comment (fixed). Nits: formatScaled, no AI trailer, npm ci, PR notes (all applied).
- Review pass 2 (fresh subagent, prototyped parser in node, all planned expectations verified): no blockers/majors. Minor: pinned edge tests '1 1 / 2' and '2 -1/2' (added); hint colour now text-muted-foreground per design.md meta row (changed); exact regexes written out (added). Nits: U+2044 noted in A3; lean test setup noted; checkbox aria-label unchanged (fine).
