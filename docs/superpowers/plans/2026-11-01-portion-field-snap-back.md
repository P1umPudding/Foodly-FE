# Plan: #71 Portionsfeld zeigt nach Verlassen den angewendeten Wert

Spec: Issue #71 (AC1-AC5) plus worker assumptions in `.git/agent-work/spec.md`.
Base: main 880d0e0, branch agent/issue-71. Scope: `src/components/recipe/PortionScaler.tsx` + `PortionScaler.test.tsx`. No library change, no stepper change.

## Approach (decision)
`DeferredNumberInput` (library) copies the `value` prop into its own `localValue` only when the prop changes, so a rejected or no-op commit leaves the typed text in the field. Two in-repo options:
- (a) `key` counter on `DeferredNumberInput`, bumped after a rejected/no-op commit → remount. Downside: remount drops focus after Enter.
- (b) **chosen:** buffer the edit in PortionScaler and render the library's exported `NumberInput` (still `@postxl/ui-components`, same look/props) directly:
  - `const [draft, setDraft] = useState<{ typed: number | null; over: number } | null>(null)` — `null` = not editing; `typed` null = the box was cleared; `over` = the applied value (`current`) the edit was typed over.
  - During render: `if (draft && draft.over !== current) setDraft(null)` — a factor change from outside (the steppers in the other row, a reset) drops the pending edit for good, so a later blur can't overwrite that change and stepping back doesn't revive it (found in code review 1).
  - `value={draft ? (draft.typed ?? undefined) : current}` → while editing, the draft shows (empty stays empty); otherwise always `current`.
  - `onChange={(v) => setDraft({ typed: v ?? null, over: current })}`
  - `onBlur` and `onEnter` → `finishEdit()`: `if (draft) commit(draft.typed); setDraft(null)`.
  Result: after every commit the field shows `current` derived from the (possibly unchanged) factor; focus stays after Enter; a later blur after Enter is a no-op. Typing a value and then tapping a stepper discards the typed value (the stepper wins).
  Why not keep DeferredNumberInput: its re-sync depends on prop changes, which is exactly the broken case.

## Steps
0. Commit the plan as `docs/superpowers/plans/2026-11-01-portion-field-snap-back.md` (repo convention, see #68/#82): commit `docs: Plan für #71 (Portionsfeld zeigt nach Verlassen den angewendeten Wert)`.
1. `PortionScaler.tsx`
   - Import `NumberInput` instead of `DeferredNumberInput`; add `useState` from react. The `useState` call sits before the `part === 'input'` / `'steppers'` early returns (hook order). Each instance has its own `draft`; the steppers-only instance never uses it.
   - NumberInput spreads `...props` after its own onBlur, so our `onBlur` replaces its internal handler; that handler only matters with `format` (not set), same as DeferredNumberInput today.
   - `commit(value)` rules (order matters):
     1. `value !== null && value < 0` → ignore (field falls back to `current`; also -0.001)
     2. `value === null || round2(value) === 0` → `onChange(1)` (empty, 0, e.g. 0.001 — spec assumption 5)
     3. `round2(value) === current` → ignore (same value, no commit; also 4.001 → shows 4)
     4. else `apply(value)`
   - Keep all props (min, aria-label, wrapperClassName, className) on `NumberInput`.
   - Comments: one line above the commit rules (no comment per rule). Rule 3 exists so a typed value that rounds to the shown value doesn't silently rescale the ingredients (4.001 → factor 1.00025); say that, not just "display".
   - Update the header comment (replace the now-inverted "a plain controlled NumberInput would snap the default back" note with 2–3 lines): the component buffers the edit itself (NumberInput + draft) so the field can be cleared while typing AND always shows the applied value after commit, even when the factor doesn't change (the library's DeferredNumberInput only re-syncs on prop change). Update the `commit` comment.
2. `PortionScaler.test.tsx`
   - Add a `renderStateful(props)` helper: small wrapper component holding `factor` in `useState` and passing `setFactor` (plus a spy) as `onChange`, so the field re-renders as in RecipeDetail.
   - The Enter test writes its steps inline (`act(() => input.focus())`, change, keyDown Enter): `fireEvent.focus` does not move document.activeElement. `type()` stays as is, except its stale comment "DeferredNumberInput only commits on blur/Enter" → "The field commits on blur/Enter".
   - `renderStateful` wraps in `TooltipProvider` like `renderScaler`; its onChange is `(f) => { spy(f); setFactor(f) }` so spy assertions see every commit. No `@testing-library/user-event` (not installed, don't add).
   - Use one `it.each` table for the snap-back cases (mode, factor, typed, expected field value, expected commit: number | null → `toHaveBeenLastCalledWith(n)` / `not.toHaveBeenCalled()`) to avoid repetition; separate `it`s only for Enter/focus, no-commit and stepper-after-commit.
   - New describe "PortionScaler — field shows the applied value":
     - portions 4, factor 1: `''` + blur → field '4' (AC1); `'0'` → '4' (AC2); `'-2'` → '4', onChange not called (AC3)
     - portions 4, factor 1.5: `'-2'` → '6' (AC3 scaled); `''` → '4' (reset to default)
     - portions 4: `'0.001'` → '4'
     - portions 4, factor 1: `'4.001'` → '4'
     - Enter instead of blur: `''` + Enter → '4', spy called with 1, input still has focus (document.activeElement). The value check proves the fix; the focus check guards against a remount approach.
     - Stepper after a commit (multiplier, `full`, stateful): `'-2'` + blur → field '1' (proves the fix), click "Mehr" → '1.5'; `''` + blur → '1', click "Mehr" → '1.5' (guards that the draft is cleared)
     - typing current value `'4'` → onChange not called
     - multiplier mode (AC4): factor 1, `''` → '1'; `'0'` → '1'; factor 1.5, `'-2'` → '1.5'; factor 1.5, `''` → '1'
     - valid value still works: portions `'6'` → field '6', onChange 1.5 (existing test covers the call)
   - Split layout (added in code review 1): two instances (`part="input"` + `part="steppers"`) sharing one factor; type 7 without blur, click "Mehr" → box '5'; "Weniger" → '4' (draft not revived); "Mehr", blur → '5', no commit of the stale 7.
   - Enter test also blurs afterwards and asserts exactly one commit.
   - No tests for `'-'` / `'abc'` (jsdom turns them into `''`, same as empty).
   - Existing test cases stay unchanged (only the stale helper comment changes); they must still pass, incl. "clearing resets to factor 1".
3. Verify: `npm run build`, `npm test -- --passWithNoTests`, `npm run format`. Visual check: try Chrome MCP / any available browser against `VITE_MOCK=1 npm run dev`; if none is available in this container (QA notes Chrome doesn't start), say so explicitly in the PR body and rely on the controlled-value tests.

## AC → verification
- AC1/AC2/AC3: stateful tests in portions mode (blur + Enter).
- AC4: stateful tests in multiplier mode.
- AC5: the test list above.
- Non-goal stepper logic: untouched; existing stepper/floor tests stay green.

## Commits
No `Co-Authored-By` or any AI trailer (CLAUDE.md overrides harness defaults).
0. `docs: Plan für #71 (Portionsfeld zeigt nach Verlassen den angewendeten Wert)`
1. `PortionScaler: Feld zeigt nach Commit immer den angewendeten Wert (#71)` — component + tests together (small change, tests prove it).
2. `PortionScaler: Stepper-Änderung verwirft eine offene Eingabe im Feld (#71)` — code review 1 fix (draft keyed to the value it was typed over).
3. `docs: Plan für #71 an den finalen Code angepasst, Draft-Kommentar gekürzt` — code review 2.
4. `docs: Plan für #71: Enter-Test und Commit-Liste nachgezogen` — code review 3.

