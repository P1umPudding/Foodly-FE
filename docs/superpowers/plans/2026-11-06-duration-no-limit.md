# Plan — #119 Arbeitszeit-Regler: ganz rechts = keine Grenze

Scope: only `src/components/list/filters/DurationFilter.tsx` + `DurationFilter.test.tsx`. No FilterControls/state/url changes (AC5 follows from `durationMax = null`, see spec W2).

## Step 1 — Slider max ⇒ null (AC1, AC3)
- DurationFilter.tsx: `onValueChange={([v]) => onChange(v === DURATION_MAX ? null : v)}`.
- Rewrite the comment at lines 7-8: the knob's far-right position means "no limit"; the field can still set a real 180 (same knob position, the field shows the difference).

## Step 2 — "Keine Grenze" display (AC2)
- Thumb `aria-valuetext`: postxl Slider doesn't forward props to the thumb. Add `sliderBoxRef = useRef<HTMLDivElement>(null)` on the wrapping `px-4` div; `useEffect(() => { const thumb = sliderBoxRef.current?.querySelector('[role=slider]'); if (value === null) thumb?.setAttribute('aria-valuetext', NO_LIMIT) else thumb?.removeAttribute('aria-valuetext') }, [value])`. Short why-comment (lib doesn't expose the thumb; Radix never touches that attribute).
- NumberInput: `placeholder={NO_LIMIT}`; `prefix`/`suffix` only when `value !== null` (avoid "≤ Keine Grenze min" in a w-28 field).
- Placeholder fit (input is `text-base md:text-sm`: ~95px at 16px on phones / ~85px at 14px vs ~94px room): add `placeholder:text-xs` to the input className up front (same size as the "min" suffix); keep w-28. Visual check still required (Step 5).
- Intended: prefix/suffix appear on the first keystroke into the empty field (no focus-dependent logic).
- `const NO_LIMIT = 'Keine Grenze'` sits next to `DURATION_MAX`. Effect comment says why `[role=slider]` is queried (postxl renders one thumb for a single value and doesn't expose it).

## Step 3 — Field 180 / clear (AC4) — no code change expected; covered by tests.

## Step 4 — Tests (AC6) in DurationFilter.test.tsx
- AC1: also PageUp from 150 (clamps to 180) ⇒ null. From initial 175, `keyDown(slider, ArrowRight)` ⇒ `set` last called with `{ durationMax: null }`, never with 180; also `End` from 30 ⇒ null.
- AC2: extend "no limit parks the knob" test: aria-valuenow 180, `aria-valuetext` = "Keine Grenze", field empty, `placeholder` = "Keine Grenze", no prefix/suffix rendered (exact `queryByText('≤')` / `queryByText('min')` within `field().parentElement`, not matching presets); after setting 45 the valuetext is gone.
- AC3: from `null` (knob at 180), ArrowLeft ⇒ `{ durationMax: 175 }`, field shows 175; from 30, Home ⇒ 0 and field shows "0" (0 is not empty).
- Focus kept: focus the empty field, type "4" ⇒ `document.activeElement === field()` and `≤` now shows.
- AC4: typing "180" ⇒ `{ durationMax: 180 }`, field shows 180, Zurücksetzen visible, no valuetext; clearing field ⇒ null.
- AC5: after slider to max, no Zurücksetzen button (in the AC1 test); null-inactive logic is covered by state.test.ts (`isFilterActive(DEFAULT_STATE)` is false, DEFAULT_STATE.durationMax = null); no new state test needed.

## Step 5 — Verify
- `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`.
- Visual check (required; Chrome MCP if available, else a dev-server screenshot or state in the PR that it was not done): placeholder fits at desktop + phone width, light/dark, and how the right-aligned placeholder looks.

## Commits
1. `DurationFilter: Regler ganz rechts hebt die Grenze auf (#119)` — code + tests together (small change). No Co-Authored-By / AI trailer (CLAUDE.md overrides harness default). Working notes stay in .git/agent-work; the final plan is committed as `docs/superpowers/plans/2026-11-06-duration-no-limit.md` (CLAUDE.md, as earlier issue PRs e.g. #97 did; the spec is the issue body, so no separate spec file).

