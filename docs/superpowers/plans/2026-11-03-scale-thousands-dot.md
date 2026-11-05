# Plan #85: read the thousands dot ("1.000") when scaling portions

Base: origin/main 3e9efe7, branch agent/issue-85. Spec: embedded in issue #85 (decision dec_747055b3, Daniel: variant B, read as thousands).

## Worker assumptions
- W1 (corrects AC2): the output decimal separator stays the comma `formatScaled` produces today, so '0.250' × 2 → "0,5"; '1,5' × 2 → "3".
- W2: thousands formatting is decided per whole amount: if either end of a range uses the thousands form, both ends get thousands dots once ≥ 1000 ('500–1.000' × 2 → "1.000–2.000").
- W3: round to 2 decimals first, then group the integer part with "."; "," stays the decimal separator ('1.000,5' × 1.5 → "1.500,75").
- W4: '1.0000', '01.000', '1234.567' stay decimal; '1.000.', '1.000,', '1.00.000', '1.000.5' pass through unchanged.
- W5: factor 1 returns the input as typed; '500' × 2 → "1000" stays (no thousands dot in the input).
- W6: '1.000.000' and '1.000,5' become scalable (no "nicht skaliert" hint any more). '1.250' now reads as 1250 (consequence of variant B).
- W7: the change stays inside `src/api/views.ts`.

## Step 1 – parse the thousands form (views.ts)
- Add `const THOUSANDS = /^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/` next to `DECIMAL`.
- `parseQuantity` keeps returning `number | null`; it checks THOUSANDS **before** DECIMAL and returns
  `Number(t.replace(/\./g, '').replace(',', '.'))` for it (no `replaceAll`: tsconfig lib is ES2020).
- `parseAmount`: `type ParsedAmount = (...existing union...) & { grouped: boolean }`, set via `THOUSANDS.test(...)` on the trimmed
  single value or on `range[1]`/`range[3]` (trimmed); true when any end matches (W2, per whole amount).
  `isScalableAmount` unchanged in code (still `parseAmount(...) !== null`).

## Step 2 – format (views.ts)
- `formatScaled(n, grouped)`: round to 2 decimals as today, split integer/fraction, and when
  `grouped` group the integer part with "." in threes (regex `\B(?=(\d{3})+(?!\d))`); decimal separator stays ",".
  Not grouped → identical to today's output.
- `scaleAmount` passes `parsed.grouped`. Factor 1 short-circuit unchanged.
- Short "why" comment on THOUSANDS (decision variant B, leading 0 stays decimal); add "1.000" to the
  existing scaleAmount comment only if it reads naturally, no second comment block.

## Step 3 – tests (views.test.ts, existing expect-list style)
New `it` blocks in `describe('scaleAmount')`:
- AC1: '1.000'×2 → '2.000'; '1.500'×2 → '3.000'; '1.000'×0.5 → '500'.
- AC2/W1: '2.5'×2 → '5'; '0.250'×2 → '0,5'; '1,5'×2 → '3'.
- AC3: '1.000.000'×2 → '2.000.000'; '1.000,5'×2 → '2.001'; '12.500'×2 → '25.000'.
- AC4: '1.000–1.500'×2 → '2.000–3.000'; '1.000-1.500'×2 → '2.000-3.000'; '1.000 - 1.500'×2 → '2.000 - 3.000';
  W2: '500–1.000'×2 → '1.000–2.000'.
- Deliberate reading change (W6): '1.250'×2 → '2.500'.
- W3: '1.000,5'×1.5 → '1.500,75'; '1.000'×(1/3) → '333,33'; '1.000,5'×0.5 → '500,25'.
- W4: '1.0000'×2 → '2'; '01.000'×2 → '2'; '1234.567'×2 → '2469,13'; pass-through list gets '1.000.', '1.000,', '1.00.000', '1.000.5'.
- W5: '1.000'×1 → '1.000'; existing '500'×2 → '1000' untouched.
- W6: isScalableAmount true list gets '1.000.000', '1.000,5'.
AC5: all existing tests (views + IngredientLine) stay green.

## Verification
`npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`. No visual check needed
(pure function; IngredientLine renders the returned string unchanged).

## Commits
No `Co-Authored-By` or other AI trailer (CLAUDE.md overrides the harness default).
0. `docs: Plan für #85 (Tausenderpunkt beim Portionieren)` – this plan incl. spec decision and W1–W7 as
   `docs/superpowers/plans/2026-11-03-scale-thousands-dot.md` (spec referenced as embedded in issue #85, no .git/agent-work paths).
1. `Portionieren: Tausenderpunkt („1.000“) beim Skalieren als Tausender lesen (#85)` – code + tests in one commit (small change).

