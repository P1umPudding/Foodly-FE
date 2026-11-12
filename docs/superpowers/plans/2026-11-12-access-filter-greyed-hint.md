# Plan #115 — visible hint under AccessFilter groups

Scope: `src/components/list/filters/AccessFilter.tsx` + `AccessFilter.test.tsx` only. No logic change in `src/list/access.ts`.

## Step 1 — component (AccessFilter.tsx)
- `AccessGroup` gets a new prop `greyedHint: string`.
- Compute `const anyGreyed = (Object.keys(meta) as V[]).some(isGreyed)`.
- After `</RadioGroup>` (still inside the group's `flex flex-col gap-1.5` wrapper, so it sits under the group and is not a radiogroup child), render when `anyGreyed`:
  `<p aria-hidden className="px-1 text-xs text-muted-foreground">{greyedHint}</p>`
  - `aria-hidden`: the per-option `aria-describedby` sr-only reason already tells screen readers (spec assumption 2); no `role="status"`/`aria-live`.
  - No `useIsDesktop`; renders on all widths. Tooltip and sr-only reason untouched.
  - Short why-comment (two lines, within printWidth): visible twin of the hover-only tooltip (design.md §7); aria-hidden because each greyed radio's aria-describedby already carries the reason.
- `AccessFilter` passes:
  - Meine Rolle: `Blasse Optionen passen nicht zur Freigabe. Auswählen setzt sie auf „Alle“.`
  - Freigabe: `Blasse Optionen passen nicht zur Rolle. Auswählen setzt sie auf „Alle“.`
- `AccessFilter` header comment unchanged.

## Step 2 — tests (AccessFilter.test.tsx)
Hint consts `ROLE_HINT`, `COLLAB_HINT` copied exactly (curly quotes „Alle“). Locate with `screen.getByText(HINT)` (ByText does not filter aria-hidden) and assert placement via `hint.previousElementSibling === screen.getByRole('radiogroup', { name })` — no reliance on the postxl wrapper structure.
- AC1a: `setup('viewer', 'shared')` → both hints present, each directly after its radiogroup, `aria-hidden="true"`, and `classList.contains` for `text-xs`, `text-muted-foreground`, `px-1`.
- AC1b (issue's combo, per Soll rule): `setup('owner', 'shared')` → role hint present, `screen.queryByText(COLLAB_HINT)` null.
- AC1c: render Betrachter × Geteilt, then `rerender` with Alle/Alle → both hints gone (fails if the hint were unconditional).
- Regression: existing sr-only/aria-describedby test stays green unchanged.

## Step 3 — checks
`npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format`, `npm run format:check`, `npm run lint` (eslint-suppressions.json must not grow). Visual check via Chrome MCP if available (desktop popover + phone bottom sheet, light/dark, line wraps within popover); otherwise state in PR that it was not done.

## Commits
0. `docs: Plan für #115` — plan copied to docs/superpowers/plans/2026-11-12-access-filter-greyed-hint.md.
1. `Zugriffsfilter: Hinweis unter Gruppen mit ausgegrauten Optionen (#115)` — component + tests together (small change).
(Format fixes, if any, folded in or a separate `format` commit.) No AI trailer.

## AC mapping
- AC1 → Step 2 tests (a/b/c). AC2 → Step 3.

## PR notes
- Section „Abweichung von AK1“: Besitzer passt zu jeder Freigabe (access.ts), daher bei Besitzer + Geteilt nur Hinweis unter „Meine Rolle“; beide Hinweise mit Betrachter + Geteilt getestet. Same note in the Dispatcher handoff.
- design.md §6 wants form help text in text-sm; issue prescribes text-xs (like DemoHint) — followed the issue, mention it.
- Existing greyedReason ("Klick setzt sie zurück") unchanged; possible follow-up.

## Review log
- Pass 1 (fresh subagent): no blocker. Major: AC1 deviation must be visible → PR section + handoff note. Minor: placement test via previousElementSibling instead of parentElement container; exact curly-quote constants; text-xs vs §6 noted in PR. Nits applied: simpler anyGreyed, one-line comment, classList checks. Not applied: committing plan to docs/superpowers/plans (pipeline keeps notes in .git/agent-work).
- Pass 2 (fresh subagent): no blocker/major; typing and test queries confirmed feasible. Applied: assertions without jest-dom (`getAttribute('aria-hidden')` → `toBe('true')`, `classList.contains(...)` → `toBe(true)`); AC1b also asserts the role hint's `previousElementSibling` is the „Meine Rolle“ radiogroup; plan committed as `docs/superpowers/plans/2026-11-12-access-filter-greyed-hint.md` (CLAUDE.md, existing precedent); Dispatcher handoff explicitly asks the owners to confirm the AC1 deviation.
